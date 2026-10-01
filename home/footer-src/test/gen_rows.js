// fake Supabase rows for the visitor map (never touches production)
const cities = [
 ['San Diego','United States',32.7,-117.2,520],['La Jolla','United States',32.8,-117.3,180],['Los Angeles','United States',34.1,-118.2,140],
 ['San Francisco','United States',37.8,-122.4,120],['San Jose','United States',37.3,-121.9,70],['Seattle','United States',47.6,-122.3,60],
 ['New York','United States',40.7,-74.0,90],['Boston','United States',42.4,-71.1,55],['Chicago','United States',41.9,-87.6,40],
 ['Austin','United States',30.3,-97.7,35],['Pittsburgh','United States',40.4,-80.0,30],['Atlanta','United States',33.7,-84.4,22],
 ['Ann Arbor','United States',42.3,-83.7,18],['Champaign','United States',40.1,-88.2,14],['Washington','United States',38.9,-77.0,25],
 ['Denver','United States',39.7,-105.0,12],['Phoenix','United States',33.4,-112.1,10],['Houston','United States',29.8,-95.4,12],
 ['Toronto','Canada',43.7,-79.4,40],['Vancouver','Canada',49.3,-123.1,28],['Montreal','Canada',45.5,-73.6,15],['Waterloo','Canada',43.5,-80.5,12],
 ['Mexico City','Mexico',19.4,-99.1,9],['Tijuana','Mexico',32.5,-117.0,11],['Sao Paulo','Brazil',-23.5,-46.6,10],['Buenos Aires','Argentina',-34.6,-58.4,5],
 ['Santiago','Chile',-33.4,-70.6,4],['Bogota','Colombia',4.7,-74.1,3],['Lima','Peru',-12.0,-77.0,2],
 ['Beijing','China',39.9,116.4,130],['Shanghai','China',31.2,121.5,110],['Shenzhen','China',22.5,114.1,60],['Hangzhou','China',30.3,120.2,45],
 ['Nanjing','China',32.1,118.8,25],['Wuhan','China',30.6,114.3,20],['Chengdu','China',30.7,104.1,18],['Hefei','China',31.8,117.2,14],
 ['Hong Kong','Hong Kong',22.3,114.2,40],['Taipei','Taiwan',25.0,121.6,30],['Hsinchu','Taiwan',24.8,121.0,12],
 ['Tokyo','Japan',35.7,139.7,55],['Osaka','Japan',34.7,135.5,14],['Seoul','South Korea',37.6,127.0,48],['Daejeon','South Korea',36.4,127.4,15],
 ['Singapore','Singapore',1.3,103.8,35],['Bangalore','India',13.0,77.6,40],['Mumbai','India',19.1,72.9,18],['New Delhi','India',28.6,77.2,20],
 ['Hyderabad','India',17.4,78.5,14],['Chennai','India',13.1,80.3,10],['Kolkata','India',22.6,88.4,6],['Dhaka','Bangladesh',23.8,90.4,4],
 ['Bangkok','Thailand',13.8,100.5,6],['Hanoi','Vietnam',21.0,105.8,8],['Ho Chi Minh City','Vietnam',10.8,106.7,5],['Kuala Lumpur','Malaysia',3.1,101.7,6],
 ['Jakarta','Indonesia',-6.2,106.8,5],['Manila','Philippines',14.6,121.0,4],['Sydney','Australia',-33.9,151.2,20],['Melbourne','Australia',-37.8,145.0,14],
 ['Brisbane','Australia',-27.5,153.0,5],['Auckland','New Zealand',-36.8,174.8,4],
 ['London','United Kingdom',51.5,-0.1,45],['Cambridge','United Kingdom',52.2,0.1,15],['Edinburgh','United Kingdom',55.9,-3.2,6],['Dublin','Ireland',53.3,-6.3,8],
 ['Paris','France',48.9,2.4,22],['Berlin','Germany',52.5,13.4,20],['Munich','Germany',48.1,11.6,16],['Zurich','Switzerland',47.4,8.5,22],
 ['Lausanne','Switzerland',46.5,6.6,8],['Amsterdam','Netherlands',52.4,4.9,14],['Delft','Netherlands',52.0,4.4,5],['Brussels','Belgium',50.8,4.4,5],
 ['Madrid','Spain',40.4,-3.7,8],['Barcelona','Spain',41.4,2.2,7],['Lisbon','Portugal',38.7,-9.1,4],['Rome','Italy',41.9,12.5,6],['Milan','Italy',45.5,9.2,7],
 ['Vienna','Austria',48.2,16.4,5],['Stockholm','Sweden',59.3,18.1,6],['Oslo','Norway',59.9,10.8,3],['Copenhagen','Denmark',55.7,12.6,4],
 ['Helsinki','Finland',60.2,24.9,3],['Warsaw','Poland',52.2,21.0,5],['Prague','Czechia',50.1,14.4,4],['Budapest','Hungary',47.5,19.0,3],
 ['Athens','Greece',38.0,23.7,3],['Istanbul','Türkiye',41.0,29.0,5],['Tel Aviv','Israel',32.1,34.8,9],['Dubai','United Arab Emirates',25.2,55.3,5],
 ['Riyadh','Saudi Arabia',24.7,46.7,4],['Doha','Qatar',25.3,51.5,2],['Cairo','Egypt',30.0,31.2,3],['Lagos','Nigeria',6.5,3.4,2],['Nairobi','Kenya',-1.3,36.8,2],
 ['Cape Town','South Africa',-33.9,18.4,3],['Johannesburg','South Africa',-26.2,28.0,2],['Moscow','Russia',55.8,37.6,6],['Kyiv','Ukraine',50.5,30.5,2],
 ['Tehran','Iran',35.7,51.4,3],['Karachi','Pakistan',24.9,67.0,2],['Lahore','Pakistan',31.5,74.3,2],['Almaty','Kazakhstan',43.2,76.9,1],
 ['Reykjavik','Iceland',64.1,-21.9,1],['Honolulu','United States',21.3,-157.9,4],['Anchorage','United States',61.2,-149.9,1]
];
const browsers=['Chrome','Safari','Edge','Firefox'], oss=['macOS','Windows','iOS','Android','Linux'];
let seed=42; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const now=Date.now(), rows=[];
for (const [city,country,lat,lon,n] of cities) for (let i=0;i<n;i++) {
  const age = 36e5 + Math.pow(rnd(),1.6)*200*864e5; // last ~200 days, skewed recent
  rows.push({ lat: Math.round((lat+(rnd()-.5)*.2)*10)/10, lon: Math.round((lon+(rnd()-.5)*.2)*10)/10, city, country,
    created_at: new Date(now-age).toISOString(), browser: browsers[Math.floor(rnd()*4)], os: oss[Math.floor(rnd()*5)],
    device: rnd()<.3?'Mobile':'Desktop', lang: 'en-US', source: 'Direct', tz: 'America/Los_Angeles', vid: 'v'+Math.floor(rnd()*1e9).toString(36) });
}
// the three most recent visits (the amber "live" pings): Tokyo, Zurich, San Diego
[['Tokyo','Japan',35.7,139.7,4],['Zurich','Switzerland',47.4,8.5,9],['San Diego','United States',32.7,-117.2,2]].forEach(([city,country,lat,lon,m])=>
  rows.push({ lat, lon, city, country, created_at: new Date(now-m*60e3).toISOString(), browser:'Chrome', os:'macOS', device:'Desktop', lang:'en-US', source:'Direct', tz:'UTC', vid:'vlive'+m }));
require('fs').writeFileSync(__dirname+'/rows.json', JSON.stringify(rows));
console.log(rows.length, 'rows', new Set(rows.map(r=>r.country)).size, 'countries');
