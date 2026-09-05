import urllib.request,re,json,concurrent.futures,html,pathlib,subprocess
from html.parser import HTMLParser
root=pathlib.Path(__file__).resolve().parents[1]
class Parser(HTMLParser):
 def __init__(self): super().__init__(); self.text=[];self.skip=0;self.main=0
 def handle_starttag(self,t,a):
  if t in ['script','style']:self.skip+=1
  if t=='main':self.main+=1
 def handle_endtag(self,t):
  if t in ['script','style']:self.skip=max(0,self.skip-1)
  if t=='main':self.main=max(0,self.main-1)
 def handle_data(self,d):
  if self.main and not self.skip and d.strip():self.text.append(d.strip())
slugs=['general-english-elicos','ielts','certificate-lll-in-individual-support','certificate-lv-in-support-of-disability','first-aid','white-card','manual-handling','certificate-lv-in-project-management','diploma-of-project-management','certificate-iii-in-solid-plastering','certificate-iii-in-construction-waterproofing','certificate-iii-in-wall-and-floor-tiling','diploma-of-buildingand-construction-building']
def get(slug):
 url='https://www.levelupacademy.vic.edu.au/'+slug
 s=subprocess.check_output(['curl','-fLs','--retry','2','--max-time','45',url]).decode();p=Parser();p.feed(s)
 images=re.findall(r'<img[^>]+>',s); imgs=[]
 for i in images:
  src=re.search(r' src="([^"]+)"',i);alt=re.search(r' alt="([^"]*)"',i)
  if src and 'wixstatic.com/media' in src[1]: imgs.append({'src':html.unescape(src[1]),'alt':html.unescape(alt[1]) if alt else ''})
 return {'slug':slug,'url':url,'text':p.text,'images':imgs}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex: data=list(ex.map(get,slugs))
(root/'docs/wix-catalogue-source.json').write_text(json.dumps(data,indent=2))
for d in data: print(d['slug'], '\n', '\n'.join(d['text'])[:13000], '\nIMAGES',json.dumps(d['images'][4:8]))
