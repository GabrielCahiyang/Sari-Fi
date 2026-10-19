"""Download reference product photos for the owner's requested demo catalog."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'product-images'
OUT.mkdir(parents=True, exist_ok=True)
PRIMO = 'https://primomart.ph'
MAGIC = 'https://www.magicstarsupermarket.com'
# Prices are transcribed, including Knorr 5.76 and Coffee Mate 4.00.
ROWS = [
 ('AJINOMOTO-VETSIN','Ajinomoto Vetsin',2.50,2.63,'Condiments & Sauces',MAGIC,'aji-no-moto-seasoning-11gx18'),
 ('CRISPY-FRY','Ajinomoto Crispy Fry',19,19.95,'Condiments & Sauces',MAGIC,'aji-crispy-fry-reg-65gm'),
 ('MAGIC-SARAP','Maggi Magic Sarap',3.20,3.36,'Condiments & Sauces',PRIMO,'48025522'),
 ('SARSAYA','Sarsaya Oyster Sauce',4.50,4.73,'Condiments & Sauces',MAGIC,'aji-sarsaya-oyster-30g'),
 ('KNORR-CUBES','Knorr Cubes',5.50,5.76,'Condiments & Sauces',PRIMO,'4800888602718'),
 ('PANCIT-CANTON','Lucky Me Pancit Canton',11.80,12.39,'Instant Noodles',PRIMO,'4807770273704'),
 ('LUCKY-ME-NOODLES','Lucky Me Noodles',9.25,9.71,'Instant Noodles',PRIMO,'4807770270024'),
 ('KOPIKO-BLACK-SOLO','Kopiko Black (Solo)',7,7.35,'Beverages',MAGIC,'kopiko-3n1-20gm-hanger'),
 ('KOPIKO-BLACK-TWIN','Kopiko Black (Twin)',16,16.80,'Beverages',PRIMO,'8998666001702'),
 ('KOPIKO-BLANCA-SOLO','Kopiko Blanca (Solo)',7,7.35,'Beverages',MAGIC,'kopiko-cafe-blanca-30g'),
 ('KOPIKO-BLANCA-TWIN','Kopiko Blanca (Twin)',16,16.80,'Beverages',PRIMO,'8998666001726'),
 ('NESCAFE-STICK','Nescafe Stick',3.50,3.68,'Beverages',MAGIC,'nesc-clsc-stick-2gx48s'),
 ('COFFEE-MATE','Coffee Mate',3.80,4,'Beverages',MAGIC,'coffeemate-48s'),
 ('ENERGEN-SOLO','Energen (Solo)',9.50,9.98,'Beverages',MAGIC,'energen-champion-35g'),
 ('ENERGEN-TWIN','Energen (Twin)',17.50,18.38,'Beverages',MAGIC,'energen-champion-2x35g-twin-pck'),
 ('MILO','Milo',9,9.45,'Beverages',PRIMO,'4800361413480'),
 ('SUNSILK','Sunsilk',7.50,7.88,'Personal Care',PRIMO,'4800888169716'),
 ('HEAD-SHOULDERS','Head & Shoulders',7,7.35,'Personal Care',PRIMO,'4902430333597'),
 ('PANTENE','Pantene',6.50,6.83,'Personal Care',PRIMO,'4902430698085'),
 ('REJOICE','Rejoice',7.80,8.19,'Personal Care',MAGIC,'rejoice-cond-rich-15ml'),
 ('KERATIN','Keratin Conditioner',8.80,9.24,'Personal Care',PRIMO,'4806515161580'),
 ('CREAM-SILK','Cream Silk Conditioner',8,8.40,'Personal Care',PRIMO,'4800888139306'),
]

def request(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'}), timeout=45) as response:
        return response.read(), response.headers.get_content_type()

def download(row):
    key,name,retail,regular,category,store,handle = row
    page = f'{store}/products/{handle}'
    product = json.loads(request(page+'.js')[0])
    image = product.get('featured_image') or product['images'][0]
    if isinstance(image,dict): image=image['src']
    if image.startswith('//'): image='https:'+image
    content,mime = request(image)
    if mime not in ('image/jpeg','image/png','image/webp') or len(content)>5*1024*1024:
        raise ValueError(f'{key}: invalid image {mime}, {len(content)} bytes')
    extension = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[mime]
    path = OUT / f'{key.lower()}.{extension}'
    path.write_bytes(content)
    print(f'{key}: {product["title"]} ({len(content)} bytes)',flush=True)
    return dict(sku='SF-'+key,name=name,basePrice=retail,sellingPrice=regular,category=category,
                supplierId='sup1788469588257' if category in ('Instant Noodles','Personal Care') else 'sup1788469553448',
                costPrice=round(retail*.85,2),stock=60,reorderLevel=12,status='active',
                localImagePath=path.relative_to(ROOT).as_posix(),imageSourcePage=page,originalImageUrl=image,
                sourceProductTitle=product['title'],imageSha256=hashlib.sha256(content).hexdigest(),
                photoNote='Representative packaging where sheet omits flavor/size. Photo rights not independently verified; sourced for requested demo.')

if __name__=='__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures=[pool.submit(download,row) for row in ROWS]
        products=[]
        errors=[]
        for row,future in zip(ROWS,futures):
            try: products.append(future.result())
            except Exception as error:
                errors.append(f'{row[0]}: {error}')
    manifest=dict(seed='owner-price-sheet-demo-2026-10-19',
                  assumptions='Owner authorized reasonable demo values: stock 60, reorder 12, estimated cost 85% of retail. Exact sheet prices preserved. Generic names do not assert sourced flavor/weight.',
                  products=products)
    (ROOT/'data'/'price-sheet-seed.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    if errors: print('FAILED: '+json.dumps(errors),flush=True)
    from PIL import Image, ImageOps, ImageDraw
    grid=Image.new('RGB',(1100,5*250),'#f6f6f6')
    for index,product in enumerate(products):
        photo=Image.open(ROOT/product['localImagePath']).convert('RGB')
        photo.thumbnail((200,205))
        x=(index%5)*220; y=(index//5)*250
        grid.paste(photo,(x+(220-photo.width)//2,y))
        ImageDraw.Draw(grid).text((x+5,y+212),product['sku'][3:],fill='black')
    grid.save(ROOT/'.tmp-product-photo-review.jpg')
