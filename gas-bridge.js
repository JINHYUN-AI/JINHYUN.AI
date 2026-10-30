/* GAS 백엔드 연결 브리지: google.script.run 호출을 fetch(POST)로 변환 (Safari 포함 모든 브라우저 동작) */
(function () {
    const API_URL = 'https://script.google.com/macros/s/AKfycbx3SxdxK70zS4VDrMbwPWivtb5l89yX3EsIDCX_OB0-9P4zAtzWy1-Yx7AqRApUE97QLA/exec';

    // 공개 읽기 데이터는 파이어스토어 복사본(구글 시트 동기화)에서 먼저 읽고, 실패하면 아래 GAS 호출로 자동 전환한다.
    const FS_BASE = 'https://firestore.googleapis.com/v1/projects/jinhyun-ai/databases/(default)/documents/cache/';
    const FS_FUNCS = ['getAboutWeek', 'getAboutData', 'getSystemData', 'getTools', 'getFooterData', 'getMetricsData', 'getProfileData', 'getPromoData'];

    function callFirestore(fn, args) {
        const L = (args && args[0]) || '-';
        const ctl = ('AbortController' in window) ? new AbortController() : null;
        const timer = ctl ? setTimeout(function () { ctl.abort(); }, 3000) : null;
        return fetch(FS_BASE + encodeURIComponent(fn + '_' + L), ctl ? { signal: ctl.signal } : undefined)
            .then(function (r) { if (!r.ok) throw new Error('Firestore ' + r.status); return r.json(); })
            .then(function (d) {
                if (timer) clearTimeout(timer);
                const j = d && d.fields && d.fields.json && d.fields.json.stringValue;
                if (typeof j !== 'string') throw new Error('Firestore 문서 형식 오류');
                return JSON.parse(j);
            }, function (e) { if (timer) clearTimeout(timer); throw e; });
    }

    function call(fn, args, onOk, onFail) {
        if (FS_FUNCS.indexOf(fn) !== -1) {
            callFirestore(fn, args).then(function (result) { if (onOk) onOk(result); })
                .catch(function () { callGas(fn, args, onOk, onFail); });
            return;
        }
        callGas(fn, args, onOk, onFail);
    }

    function callGas(fn, args, onOk, onFail) {
        fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ fn: fn, args: args })
        })
            .then(r => r.json())
            .then(res => {
                if (res && res.ok) { if (onOk) onOk(res.result); }
                else { throw new Error((res && res.error) || '서버 오류'); }
            })
            .catch(err => { if (onFail) onFail(err); else console.error('[GAS]', fn, err); });
    }

    function makeRunner(onOk, onFail) {
        return new Proxy({}, {
            get: function (_, name) {
                if (name === 'withSuccessHandler') return function (f) { return makeRunner(f, onFail); };
                if (name === 'withFailureHandler') return function (f) { return makeRunner(onOk, f); };
                if (name === 'withUserObject') return function () { return makeRunner(onOk, onFail); };
                return function () { call(name, Array.prototype.slice.call(arguments), onOk, onFail); };
            }
        });
    }

    window.google = window.google || {};
    window.google.script = { run: makeRunner(null, null) };
})();
