// Avery Orphanage Note Mod
// 在贝利办公室留便签，阻止艾弗里孤儿院强制收养事件

(function() {
    'use strict';

    function getBaileyPronoun() {
        try {
            if (State.variables.NPCList && State.variables.NPCList[1] && State.variables.NPCList[1].pronouns) {
                return State.variables.NPCList[1].pronouns.him || '他';
            }
        } catch(e) {}
        return '他';
    }

    function shouldShowOption() {
        try {
            if (State.variables.avery_mansion !== undefined) { console.log("[AON] hide: mansion defined"); return false; }
            if (typeof C !== 'undefined' && C.npc && C.npc.Avery && C.npc.Avery.state !== 'active') { console.log("[AON] hide: avery not active"); return false; }
            if (typeof Time !== 'undefined' && Time.hour >= 7 && Time.hour < 10) { console.log("[AON] hide: bailey in office (hour=" + Time.hour + ")"); return false; }
            console.log("[AON] show option, note=" + State.variables.avery_orphanage_note);
            return true;
        } catch(e) {
            console.log("[AON] shouldShowOption error:", e);
            return false;
        }
    }

    function createButton(active, pronoun) {
        var a = document.createElement('a');
        a.className = 'link-internal';
        a.setAttribute('tabindex', '0');
        if (active) {
            a.textContent = '给贝利留便签，告诉' + pronoun + '你对艾弗里没那么排斥了';
        } else {
            a.textContent = '给贝利留便签，告诉' + pronoun + '你不想跟艾弗里走';
        }
        return a;
    }

    function handleNoteClick(e) {
        e.preventDefault();
        e.stopPropagation();
        var isActive = State.variables.avery_orphanage_note === 1;
        console.log("[AON] click, was active=" + isActive);
        if (isActive) {
            delete State.variables.avery_orphanage_note;
        } else {
            State.variables.avery_orphanage_note = 1;
        }
        var old = document.getElementById('avery-orphanage-note-container');
        if (old) old.remove();
        injectOption();
    }

    function injectOption() {
        console.log("[AON] injectOption called");
        if (document.getElementById('avery-orphanage-note-container')) {
            console.log("[AON] already exists, skip");
            return;
        }
        if (!shouldShowOption()) return;

        var passageEl = document.querySelector('.passage');
        if (!passageEl) { console.log("[AON] no .passage element"); return; }

        var active = State.variables.avery_orphanage_note === 1;
        var pronoun = getBaileyPronoun();

        var container = document.createElement('div');
        container.id = 'avery-orphanage-note-container';
        container.appendChild(document.createElement('br'));

        var btn = createButton(active, pronoun);
        container.appendChild(btn);
        container.appendChild(document.createElement('br'));

        btn.addEventListener('click', handleNoteClick);

        passageEl.appendChild(container);
        console.log("[AON] injected successfully");
    }

    // ========== 事件拦截：临时替换 averyMansionScore 函数 ==========
    var originalScoreFn = null;
    var scoreFnPatched = false;

    function patchScoreFn() {
        if (scoreFnPatched) return;
        // 尝试在多个可能的位置找到函数
        var fn = null;
        if (typeof window.averyMansionScore === 'function') fn = window.averyMansionScore;
        else if (typeof averyMansionScore === 'function') fn = averyMansionScore;

        if (!fn) {
            console.log("[AON] averyMansionScore function not found, trying C.npc.Avery.state approach");
            return false;
        }
        originalScoreFn = fn;
        var patched = function() { return 0; };
        if (typeof window.averyMansionScore === 'function') window.averyMansionScore = patched;
        else if (typeof averyMansionScore === 'function') { try { averyMansionScore = patched; } catch(e) {} }
        scoreFnPatched = true;
        console.log("[AON] averyMansionScore patched");
        return true;
    }

    function restoreScoreFn() {
        if (!scoreFnPatched || !originalScoreFn) return;
        if (typeof window.averyMansionScore !== 'undefined') window.averyMansionScore = originalScoreFn;
        try { if (typeof averyMansionScore !== 'undefined') averyMansionScore = originalScoreFn; } catch(e) {}
        scoreFnPatched = false;
        originalScoreFn = null;
        console.log("[AON] averyMansionScore restored");
    }

    // 备用方案：临时修改 C.npc.Avery.state
    var originalAveryState = null;

    function patchAveryState() {
        if (typeof C === 'undefined' || !C.npc || !C.npc.Avery) return false;
        originalAveryState = C.npc.Avery.state;
        C.npc.Avery.state = 'inactive';
        console.log("[AON] Avery.state patched from " + originalAveryState + " to inactive");
        return true;
    }

    function restoreAveryState() {
        if (originalAveryState === null || typeof C === 'undefined' || !C.npc || !C.npc.Avery) return;
        C.npc.Avery.state = originalAveryState;
        console.log("[AON] Avery.state restored to " + originalAveryState);
        originalAveryState = null;
    }

    // 等待 jQuery 和 SugarCube 就绪
    function init() {
        var $ = window.jQuery || window.$;
        if (!$ || typeof Story === 'undefined' || typeof State === 'undefined') {
            setTimeout(init, 100);
            return;
        }
        startMod($);
    }

    function startMod($) {
        $(document).on(':passagedisplay', function(ev) {
            if (!ev.passage) return;
            console.log("[AON] passagedisplay: " + ev.passage.title);
            if (ev.passage.title === "Bailey's Office") {
                injectOption();
            }
        });

        // 进入孤儿院时拦截
        $(document).on(':passagestart', function(ev) {
            if (!ev.passage || ev.passage.title !== 'Orphanage') return;
            if (State.variables.avery_orphanage_note !== 1) return;
            console.log("[AON] blocking Avery event in Orphanage");
            // 优先用函数替换，失败则用 state 替换
            if (!patchScoreFn()) {
                patchAveryState();
            }
        });

        $(document).on(':passageend', function(ev) {
            if (!ev.passage || ev.passage.title !== 'Orphanage') return;
            restoreScoreFn();
            restoreAveryState();
        });

        console.log("[AveryOrphanageNote] Mod loaded");
    }

    init();
})();
