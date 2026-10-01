// tourstream-spa-index-rewrite (CloudFront Function, viewer-request)
// 1) 옛 로마자 슬러그(/category/gyotong-paeseu)로 들어온 요청을 새 영어 슬러그로 301 이동
// 2) 확장자가 없는 경로는 SPA용 index.html로 rewrite
// 슬러그 표를 바꾸면 이 파일의 MAP도 함께 갱신해야 한다 (packages/main/src/v2/data/slugMap.json)
var MAP = {
  category: {"beoseu-idong":"bus-transfer","dongmulwon":"zoo","gonghang-rimujin":"airport-bus","gonghangyeolcha-teukgeup":"airport-train","gyotong-paeseu":"transport-pass","jeonmangdae":"observation-deck","jihacheol-paeseugwon":"subway-pass","jihacheol-sitipaeseu":"city-pass","keibeulka":"cable-car","myujieom-jeonsi":"museum","noligongwon":"amusement-park","oncheon-seupa":"onsen-spa","sujokgwan-dongmulwon":"aquarium-zoo","temapakeu":"theme-park","tiket-ipjanggwon":"tickets","tueo-aektibiti":"tours-activities","tueo-cheheom":"tours-activities"},
  country: {"aiseulrandeu":"iceland","arapemiriteu":"uae","beurajil":"brazil","cheko":"czechia","geuriseu":"greece","hoju":"australia","ijipteu":"egypt","indo":"india","jungguk":"china","kaenada":"canada","makao":"macau","malreisia":"malaysia","namapeurikagonghwaguk":"south-africa","nedeolrandeu":"netherlands","nyujilraendeu":"new-zealand","pilripin":"philippines","seupein":"spain","seuwiseu":"switzerland","twireukiye":"turkiye","yeongguk":"united-kingdom","yoreudan":"jordan"},
  region: {"ageura":"agra","amseutereudam":"amsterdam","atene":"athens","balri":"bali","bareuselrona":"barcelona","dalrat":"da-lat","danang":"da-nang","dokyo":"tokyo","gija-kairo":"giza-cairo","halriudeu":"hollywood","hochimin":"ho-chi-minh","hukuoka":"fukuoka","inteoraken":"interlaken","iseutanbul":"istanbul","jueol-changi":"jewel-changi","keipeutaun":"cape-town","kualrarumpureu":"kuala-lumpur","kuseuko":"cusco","la":"los-angeles","marina-bei-saenjeu":"marina-bay-sands","naiagara-polseu":"niagara-falls","nateurang":"nha-trang","nyuyok":"new-york","okeulraendeu":"auckland","olraendo":"orlando","pari":"paris","peuraha":"prague","pingsi":"pingxi","puket":"phuket","pukkuok":"phu-quoc","reikyabikeu":"reykjavik","reondeon":"london","riudejaneiru":"rio-de-janeiro","roma":"rome","sanghai":"shanghai","sebu":"cebu","sideuni":"sydney","taibei":"taipei","ubut":"ubud","wadimusa":"wadi-musa"}
};

function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // www 는 정규 주소(apex)로 보낸다. 같은 내용이 두 호스트로 색인되는 것을 막는다.
    var host = request.headers.host ? request.headers.host.value : '';
    if (host.indexOf('www.') === 0) {
        var q = '';
        if (request.querystring) {
            var parts2 = [];
            for (var k2 in request.querystring) {
                parts2.push(request.querystring[k2].value ? k2 + '=' + request.querystring[k2].value : k2);
            }
            if (parts2.length) q = '?' + parts2.join('&');
        }
        return {
            statusCode: 301,
            statusDescription: 'Moved Permanently',
            headers: { location: { value: 'https://' + host.substring(4) + uri + q } }
        };
    }

    // 레거시 /v2/* 경로는 현재 디자인과 같은 화면이라 정규 주소로 보낸다
    if (uri === '/v2' || uri.indexOf('/v2/') === 0) {
        var to = uri === '/v2' ? '/' : uri.substring(3);
        return {
            statusCode: 301,
            statusDescription: 'Moved Permanently',
            headers: { location: { value: to } }
        };
    }

    var parts = uri.split('/');
    // ['', 'category', 'gyotong-paeseu'] 또는 ['', 'destination', '<region>', '<category>']
    var moved = false;
    if (parts.length >= 3) {
        var kind = parts[1];
        if ((kind === 'category' || kind === 'country' || kind === 'region') && MAP[kind][parts[2]]) {
            parts[2] = MAP[kind][parts[2]];
            moved = true;
        } else if (kind === 'destination' && parts.length >= 4) {
            if (MAP.region[parts[2]]) { parts[2] = MAP.region[parts[2]]; moved = true; }
            if (MAP.category[parts[3]]) { parts[3] = MAP.category[parts[3]]; moved = true; }
        }
    }

    if (moved) {
        var target = parts.join('/');
        if (request.querystring) {
            var qs = [];
            for (var k in request.querystring) {
                qs.push(request.querystring[k].value ? k + '=' + request.querystring[k].value : k);
            }
            if (qs.length) target += '?' + qs.join('&');
        }
        return {
            statusCode: 301,
            statusDescription: 'Moved Permanently',
            headers: { location: { value: target } }
        };
    }

    if (!uri.includes('.')) {
        if (uri.endsWith('/')) {
            request.uri += 'index.html';
        } else {
            request.uri += '/index.html';
        }
    }

    return request;
}
