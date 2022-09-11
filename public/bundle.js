
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
            : ctx.$$scope.ctx;
    }
    function get_slot_changes(definition, ctx, changed, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
            : ctx.$$scope.changed || {};
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    let running = false;
    function run_tasks() {
        tasks.forEach(task => {
            if (!task[0](now())) {
                tasks.delete(task);
                task[1]();
            }
        });
        running = tasks.size > 0;
        if (running)
            raf(run_tasks);
    }
    function loop(fn) {
        let task;
        if (!running) {
            running = true;
            raf(run_tasks);
        }
        return {
            promise: new Promise(fulfil => {
                tasks.add(task = [fn, fulfil]);
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
    }

    function create_animation(node, from, fn, params) {
        if (!from)
            return noop;
        const to = node.getBoundingClientRect();
        if (from.left === to.left && from.right === to.right && from.top === to.top && from.bottom === to.bottom)
            return noop;
        const { delay = 0, duration = 300, easing = identity, 
        // @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
        start: start_time = now() + delay, 
        // @ts-ignore todo:
        end = start_time + duration, tick = noop, css } = fn(node, { from, to }, params);
        let running = true;
        let started = false;
        let name;
        function start() {
            if (css) {
                name = create_rule(node, 0, 1, duration, delay, easing, css);
            }
            if (!delay) {
                started = true;
            }
        }
        function stop() {
            if (css)
                delete_rule(node, name);
            running = false;
        }
        loop(now => {
            if (!started && now >= start_time) {
                started = true;
            }
            if (started && now >= end) {
                tick(1, 0);
                stop();
            }
            if (!running) {
                return false;
            }
            if (started) {
                const p = now - start_time;
                const t = 0 + 1 * easing(p / duration);
                tick(t, 1 - t);
            }
            return true;
        });
        start();
        tick(0, 1);
        return stop;
    }
    function fix_position(node) {
        const style = getComputedStyle(node);
        if (style.position !== 'absolute' && style.position !== 'fixed') {
            const { width, height } = style;
            const a = node.getBoundingClientRect();
            node.style.position = 'absolute';
            node.style.width = width;
            node.style.height = height;
            add_transform(node, a);
        }
    }
    function add_transform(node, a) {
        const b = node.getBoundingClientRect();
        if (a.left !== b.left || a.top !== b.top) {
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function fix_and_outro_and_destroy_block(block, lookup) {
        block.f();
        outro_and_destroy_block(block, lookup);
    }
    function update_keyed_each(old_blocks, changed, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(changed, child_ctx);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/pages/Login.svelte generated by Svelte v3.12.1 */

    const file = "src/pages/Login.svelte";

    function create_fragment(ctx) {
    	var h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "welcome to login page";
    			add_location(h1, file, 0, 0, 0);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Login", options, id: create_fragment.name });
    	}
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    /**
     * Derived value store by synchronizing one or more readable stores and
     * applying an aggregation function over its input values.
     * @param {Stores} stores input stores
     * @param {function(Stores=, function(*)=):*}fn function callback that aggregates the values
     * @param {*=}initial_value when used asynchronously
     */
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => store.subscribe((value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const globalStore = writable({
      sidebar: false,
      cart: false,
      alert: false
    });

    const store = {
      subscribe: globalStore.subscribe,
      toggleItem: (item, value) => {
        globalStore.update(storeValues => {
          return { ...storeValues, [item]: value }
        });
      }
    };

    // cart
    const cart = writable(getStorageCart());
    // cart total
    const cartTotal = derived(cart, $cart => {
      let total = $cart.reduce((acc, curr) => {
        return (acc += curr.amount * curr.price);
      }, 0);
      return total.toFixed(2);
    });
    // local functions
    const remove = (id, items) => {
      return items.filter(item => item.id !== id);
    };
    const toggleAmount = (id, items, action) => {
      return items.map(item => {
        let newAmount;
        if (action === "inc") {
          newAmount = item.amount + 1;
        } else if (action === "dec") {
          newAmount = item.amount - 1;
        } else {
          newAmount = item.amount;
        }
        return item.id === id ? { ...item, amount: newAmount } : { ...item };
      });
    };
    // global functions
    const removeItem = id => {
      cart.update(storeValue => {
        return remove(id, storeValue);
      });
    };
    const increaseAmount = id => {
      cart.update(storeValue => {
        return toggleAmount(id, storeValue, "inc");
      });
    };
    const decreaseAmount = (id, amount) => {
      cart.update(storeValue => {
        // let item = storeValue.find(item => item.id === id);
        let cart;
        if (amount === 1) {
          cart = remove(id, storeValue);
        } else {
          cart = toggleAmount(id, storeValue, "dec");
        }
        return [...cart];
      });
    };
    // localStorage

    const addToCart = product => {
      cart.update(storeValue => {
        const { id, image, title, price, amount } = product;
        let item = storeValue.find(item => item.id === id);
        let cart;

        if (item) {
          cart = toggleAmount(id, storeValue, 'inc');
        } else {
          let newItem = { id, image, title, price, amount: 1 };
          cart = [...storeValue, newItem];
        }
        return cart;
      });
    };

    //localStorage
    function getStorageCart() {
      return localStorage.getItem('cart') ? JSON.parse(localStorage.getItem('cart')) : []
    }

    function setStorageCart(cartValues) {
      localStorage.setItem('cart', JSON.stringify(cartValues));
    }

    var localProducts = [
      {
        id: 1,
        title: "razor blade",
        price: 1.99,
        description:
          "Lorem ipsum dolor amet leggings microdosing man bun, YOLO normcore four loko authentic poke. Man braid wolf cornhole YOLO, cronut succulents chambray fashion axe. Whatever truffaut lomo distillery meditation marfa, shaman quinoa selvage retro la croix bushwick banh mi kitsch. Glossier blog chillwave vinyl vice. Etsy sustainable bespoke art party kitsch hashtag mlkshk cold-pressed kinfolk selfies. Tumblr deep v shabby chic, authentic gochujang pour-over selvage tofu next level street art pitchfork viral knausgaard polaroid. Everyday carry authentic truffaut marfa retro.",
        featured: true,
        created_at: "2019-10-27T21:38:58.014Z",
        updated_at: "2019-10-27T22:52:25.274Z",
        image: {
          id: 1,
          name: "product-1.png",
          hash: "4fd71e9608434f87bc9529b8a71b1de5",
          sha256: "Lr1IhG6PdCbYB-mQejx3dx5WyJ4mp0qLR_ui3E5agYM",
          ext: ".png",
          mime: "image/png",
          size: "94.63",
          url: "/assets/product-images/product-1.png",
          provider: "local",
          provider_metadata: null,
          created_at: "2019-10-27T21:38:58.043Z",
          updated_at: "2019-10-27T21:38:58.043Z"
        }
      },
      {
        id: 2,
        title: "Gillette Razor",
        price: 9.99,
        description:
          "Lorem ipsum dolor amet leggings microdosing man bun, YOLO normcore four loko authentic poke. Man braid wolf cornhole YOLO, cronut succulents chambray fashion axe. Whatever truffaut lomo distillery meditation marfa, shaman quinoa selvage retro la croix bushwick banh mi kitsch. Glossier blog chillwave vinyl vice. Etsy sustainable bespoke art party kitsch hashtag mlkshk cold-pressed kinfolk selfies. Tumblr deep v shabby chic, authentic gochujang pour-over selvage tofu next level street art pitchfork viral knausgaard polaroid. Everyday carry authentic truffaut marfa retro.",
        featured: true,
        created_at: "2019-10-27T21:39:45.612Z",
        updated_at: "2019-10-27T22:52:06.354Z",
        image: {
          id: 2,
          name: "product-2.png",
          hash: "2cc56db3bcb54350b84002691ab319f3",
          sha256: "hYYdYDNGw6TxLbcG1H-WDZaTqRp-Oi4K4WRdAN91ZAs",
          ext: ".png",
          mime: "image/png",
          size: "22.99",
          url: "/assets/product-images/product-2.png",
          provider: "local",
          provider_metadata: null,
          created_at: "2019-10-27T21:39:45.628Z",
          updated_at: "2019-10-27T21:39:45.628Z"
        }
      },
      {
        id: 3,
        title: "Barber Razor",
        price: 7.99,
        description:
          "Lorem ipsum dolor amet leggings microdosing man bun, YOLO normcore four loko authentic poke. Man braid wolf cornhole YOLO, cronut succulents chambray fashion axe. Whatever truffaut lomo distillery meditation marfa, shaman quinoa selvage retro la croix bushwick banh mi kitsch. Glossier blog chillwave vinyl vice. Etsy sustainable bespoke art party kitsch hashtag mlkshk cold-pressed kinfolk selfies. Tumblr deep v shabby chic, authentic gochujang pour-over selvage tofu next level street art pitchfork viral knausgaard polaroid. Everyday carry authentic truffaut marfa retro.",
        featured: null,
        created_at: "2019-10-28T00:57:44.490Z",
        updated_at: "2019-10-28T00:57:44.490Z",
        image: {
          id: 3,
          name: "product-3.png",
          hash: "fab437959bd442518f19cf3a42d2a96a",
          sha256: "rRWmzg-R6dXlJY8_reZtZXXa9w9Qb1qLMTlMRLS7SW0",
          ext: ".png",
          mime: "image/png",
          size: "19.45",
          url: "/assets/product-images/product-3.png",
          provider: "local",
          provider_metadata: null,
          created_at: "2019-10-28T00:57:44.511Z",
          updated_at: "2019-10-28T00:57:44.511Z"
        }
      },
      {
        id: 4,
        title: "Electric Razor",
        price: 20.99,
        description:
          "Lorem ipsum dolor amet leggings microdosing man bun, YOLO normcore four loko authentic poke. Man braid wolf cornhole YOLO, cronut succulents chambray fashion axe. Whatever truffaut lomo distillery meditation marfa, shaman quinoa selvage retro la croix bushwick banh mi kitsch. Glossier blog chillwave vinyl vice. Etsy sustainable bespoke art party kitsch hashtag mlkshk cold-pressed kinfolk selfies. Tumblr deep v shabby chic, authentic gochujang pour-over selvage tofu next level street art pitchfork viral knausgaard polaroid. Everyday carry authentic truffaut marfa retro.",
        featured: null,
        created_at: "2019-10-28T01:36:25.217Z",
        updated_at: "2019-10-28T01:36:25.217Z",
        image: {
          id: 4,
          name: "product-4.png",
          hash: "0f9f9e052cdb4d0e968abbb912288af8",
          sha256: "NV87SgCwSqJbCVqauxRrJjaa86iEoUuYhlXYtOl1oFU",
          ext: ".png",
          mime: "image/png",
          size: "19.83",
          url: "/assets/product-images/product-4.png",
          provider: "local",
          provider_metadata: null,
          created_at: "2019-10-28T01:36:25.229Z",
          updated_at: "2019-10-28T01:36:25.229Z"
        }
      },
      {
        id: 5,
        title: "Vintage Razor",
        price: 33.99,
        description:
          "Lorem ipsum dolor amet squid tbh crucifix woke, vegan banjo succulents try-hard distillery waistcoat photo booth. Chillwave single-origin coffee art party snackwave palo santo before they sold out. Lyft brooklyn gluten-free, vape XOXO hella unicorn meggings banh mi heirloom air plant copper mug fixie lo-fi. Vaporware copper mug semiotics pok pok kogi poutine.",
        featured: null,
        created_at: "2019-10-28T19:46:08.939Z",
        updated_at: "2019-10-28T19:46:08.939Z",
        image: {
          id: 5,
          name: "product-5.png",
          hash: "86a5e581cf0143a6ada9a437093aebfb",
          sha256: "Dm6OwRAp4murQgQ1KUagkDVxDwt7KZj58EjeO-VPUOE",
          ext: ".png",
          mime: "image/png",
          size: "24.80",
          url: "/assets/product-images/product-5.png",
          provider: "local",
          provider_metadata: null,
          created_at: "2019-10-28T19:46:08.964Z",
          updated_at: "2019-10-28T19:46:08.964Z"
        }
      },
      {
        id: 6,
        title: "Gillette Orange Razor",
        price: 12.99,
        description:
          "Lorem ipsum dolor amet squid tbh crucifix woke, vegan banjo succulents try-hard distillery waistcoat photo booth. Chillwave single-origin coffee art party snackwave palo santo before they sold out. Lyft brooklyn gluten-free, vape XOXO hella unicorn meggings banh mi heirloom air plant copper mug fixie lo-fi. Vaporware copper mug semiotics pok pok kogi poutine.",
        featured: null,
        created_at: "2019-10-28T19:58:34.104Z",
        updated_at: "2019-10-28T19:58:34.104Z",
        image: {
          id: 6,
          name: "product-6.png",
          hash: "ab465a7ab2f4464b86b2e9b82c45addb",
          sha256: "HPr1b8is5yGhwQQJd1PUBK_m-mEw3wpCoXP4QyIepLo",
          ext: ".png",
          mime: "image/png",
          size: "15.27",
          url: "/assets/product-images/product-6.png",
          provider: "local",
          provider_metadata: null,
          created_at: "2019-10-28T19:58:34.119Z",
          updated_at: "2019-10-28T19:58:34.119Z"
        }
      },
      {
        id: 7,
        title: "Gillette Blue Razor",
        price: 17.99,
        description:
          "Lorem ipsum dolor amet squid tbh crucifix woke, vegan banjo succulents try-hard distillery waistcoat photo booth. Chillwave single-origin coffee art party snackwave palo santo before they sold out. Lyft brooklyn gluten-free, vape XOXO hella unicorn meggings banh mi heirloom air plant copper mug fixie lo-fi. Vaporware copper mug semiotics pok pok kogi poutine.",
        featured: true,
        created_at: "2019-10-28T20:09:56.444Z",
        updated_at: "2019-10-28T20:09:56.444Z",
        image: {
          id: 7,
          name: "product-7.png",
          hash: "5a120cff57d24ad184b949b9235097b2",
          sha256: "FEvujME4KbZKGz8lDSkND_7QUXud0BO38yIPY5KMRwI",
          ext: ".png",
          mime: "image/png",
          size: "18.50",
          url: "/assets/product-images/product-7.png",
          provider: "local",
          provider_metadata: null,
          created_at: "2019-10-28T20:09:56.461Z",
          updated_at: "2019-10-28T20:09:56.461Z"
        }
      },
      {
        id: 8,
        title: "Old School Razor",
        price: 40.99,
        description:
          "Lorem ipsum dolor amet squid tbh crucifix woke, vegan banjo succulents try-hard distillery waistcoat photo booth. Chillwave single-origin coffee art party snackwave palo santo before they sold out. Lyft brooklyn gluten-free, vape XOXO hella unicorn meggings banh mi heirloom air plant copper mug fixie lo-fi. Vaporware copper mug semiotics pok pok kogi poutine.",
        featured: null,
        created_at: "2019-10-28T20:10:40.850Z",
        updated_at: "2019-10-28T20:10:40.850Z",
        image: {
          id: 8,
          name: "product-8.png",
          hash: "a3b34b9b4aab4e23b816a2ce05da01d9",
          sha256: "iFN9i6Z6kXHJ--4e64wSN-td4R-Wb-wHY8OMLvhBQzo",
          ext: ".png",
          mime: "image/png",
          size: "19.36",
          url: "/assets/product-images/product-8.png",
          provider: "local",
          provider_metadata: null,
          created_at: "2019-10-28T20:10:40.863Z",
          updated_at: "2019-10-28T20:10:40.863Z"
        }
      },
      {
        id: 9,
        title: "Panasonic Electric Shaver",
        price: 24.99,
        description:
          "Lorem ipsum dolor amet squid tbh crucifix woke, vegan banjo succulents try-hard distillery waistcoat photo booth. Chillwave single-origin coffee art party snackwave palo santo before they sold out. Lyft brooklyn gluten-free, vape XOXO hella unicorn meggings banh mi heirloom air plant copper mug fixie lo-fi. Vaporware copper mug semiotics pok pok kogi poutine.",
        featured: true,
        created_at: "2019-10-28T20:12:30.375Z",
        updated_at: "2019-10-28T20:26:12.927Z",
        image: {
          id: 9,
          name: "product-9.png",
          hash: "ac98629e1b474d2b89f3ad8e4d3bbcb0",
          sha256: "G9rriv6IvzwvPE101J1aO9iGNjNVZu3CXmthgDCgYmY",
          ext: ".png",
          mime: "image/png",
          size: "19.73",
          url: "/assets/product-images/product-9.png",
          provider: "local",
          provider_metadata: null,
          created_at: "2019-10-28T20:12:30.387Z",
          updated_at: "2019-10-28T20:12:30.387Z"
        }
      }
    ];

    const store$1 = writable(flattenProducts([...localProducts]));

    function flattenProducts(data) {
      return data.map(item => {
        let image = item.image.url;
        return { ...item, image }
      });
    }

    /* src/components/Loading.svelte generated by Svelte v3.12.1 */

    const file$1 = "src/components/Loading.svelte";

    function create_fragment$1(ctx) {
    	var div, h10, t1, h11, t3, img;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h10 = element("h1");
    			h10.textContent = "Please be patient";
    			t1 = space();
    			h11 = element("h1");
    			h11.textContent = "loading data from heroku";
    			t3 = space();
    			img = element("img");
    			add_location(h10, file$1, 1, 2, 24);
    			add_location(h11, file$1, 2, 2, 53);
    			attr_dev(img, "src", "/assets/images/loading.gif");
    			attr_dev(img, "alt", "loading gif");
    			add_location(img, file$1, 3, 2, 89);
    			attr_dev(div, "class", "loading");
    			add_location(div, file$1, 0, 0, 0);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h10);
    			append_dev(div, t1);
    			append_dev(div, h11);
    			append_dev(div, t3);
    			append_dev(div, img);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    class Loading extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$1, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Loading", options, id: create_fragment$1.name });
    	}
    }

    const LOCATION = {};
    const ROUTER = {};

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    function getLocation(source) {
      return {
        ...source.location,
        state: source.history.state,
        key: (source.history.state && source.history.state.key) || "initial"
      };
    }

    function createHistory(source, options) {
      const listeners = [];
      let location = getLocation(source);

      return {
        get location() {
          return location;
        },

        listen(listener) {
          listeners.push(listener);

          const popstateListener = () => {
            location = getLocation(source);
            listener({ location, action: "POP" });
          };

          source.addEventListener("popstate", popstateListener);

          return () => {
            source.removeEventListener("popstate", popstateListener);

            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
          };
        },

        navigate(to, { state, replace = false } = {}) {
          state = { ...state, key: Date.now() + "" };
          // try...catch iOS Safari limits to 100 pushState calls
          try {
            if (replace) {
              source.history.replaceState(state, null, to);
            } else {
              source.history.pushState(state, null, to);
            }
          } catch (e) {
            source.location[replace ? "replace" : "assign"](to);
          }

          location = getLocation(source);
          listeners.forEach(listener => listener({ location, action: "PUSH" }));
        }
      };
    }

    // Stores history entries in memory for testing or other platforms like Native
    function createMemorySource(initialPathname = "/") {
      let index = 0;
      const stack = [{ pathname: initialPathname, search: "" }];
      const states = [];

      return {
        get location() {
          return stack[index];
        },
        addEventListener(name, fn) {},
        removeEventListener(name, fn) {},
        history: {
          get entries() {
            return stack;
          },
          get index() {
            return index;
          },
          get state() {
            return states[index];
          },
          pushState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            index++;
            stack.push({ pathname, search });
            states.push(state);
          },
          replaceState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            stack[index] = { pathname, search };
            states[index] = state;
          }
        }
      };
    }

    // Global history uses window.history as the source if available,
    // otherwise a memory history
    const canUseDOM = Boolean(
      typeof window !== "undefined" &&
        window.document &&
        window.document.createElement
    );
    const globalHistory = createHistory(canUseDOM ? window : createMemorySource());
    const { navigate } = globalHistory;

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    const paramRe = /^:(.+)/;

    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;

    /**
     * Check if `segment` is a root segment
     * @param {string} segment
     * @return {boolean}
     */
    function isRootSegment(segment) {
      return segment === "";
    }

    /**
     * Check if `segment` is a dynamic segment
     * @param {string} segment
     * @return {boolean}
     */
    function isDynamic(segment) {
      return paramRe.test(segment);
    }

    /**
     * Check if `segment` is a splat
     * @param {string} segment
     * @return {boolean}
     */
    function isSplat(segment) {
      return segment[0] === "*";
    }

    /**
     * Split up the URI into segments delimited by `/`
     * @param {string} uri
     * @return {string[]}
     */
    function segmentize(uri) {
      return (
        uri
          // Strip starting/ending `/`
          .replace(/(^\/+|\/+$)/g, "")
          .split("/")
      );
    }

    /**
     * Strip `str` of potential start and end `/`
     * @param {string} str
     * @return {string}
     */
    function stripSlashes(str) {
      return str.replace(/(^\/+|\/+$)/g, "");
    }

    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */
    function rankRoute(route, index) {
      const score = route.default
        ? 0
        : segmentize(route.path).reduce((score, segment) => {
            score += SEGMENT_POINTS;

            if (isRootSegment(segment)) {
              score += ROOT_POINTS;
            } else if (isDynamic(segment)) {
              score += DYNAMIC_POINTS;
            } else if (isSplat(segment)) {
              score -= SEGMENT_POINTS + SPLAT_PENALTY;
            } else {
              score += STATIC_POINTS;
            }

            return score;
          }, 0);

      return { route, score, index };
    }

    /**
     * Give a score to all routes and sort them on that
     * @param {object[]} routes
     * @return {object[]}
     */
    function rankRoutes(routes) {
      return (
        routes
          .map(rankRoute)
          // If two routes have the exact same score, we go by index instead
          .sort((a, b) =>
            a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
          )
      );
    }

    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { path, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */
    function pick(routes, uri) {
      let match;
      let default_;

      const [uriPathname] = uri.split("?");
      const uriSegments = segmentize(uriPathname);
      const isRootUri = uriSegments[0] === "";
      const ranked = rankRoutes(routes);

      for (let i = 0, l = ranked.length; i < l; i++) {
        const route = ranked[i].route;
        let missed = false;

        if (route.default) {
          default_ = {
            route,
            params: {},
            uri
          };
          continue;
        }

        const routeSegments = segmentize(route.path);
        const params = {};
        const max = Math.max(uriSegments.length, routeSegments.length);
        let index = 0;

        for (; index < max; index++) {
          const routeSegment = routeSegments[index];
          const uriSegment = uriSegments[index];

          if (routeSegment !== undefined && isSplat(routeSegment)) {
            // Hit a splat, just grab the rest, and return a match
            // uri:   /files/documents/work
            // route: /files/* or /files/*splatname
            const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

            params[splatName] = uriSegments
              .slice(index)
              .map(decodeURIComponent)
              .join("/");
            break;
          }

          if (uriSegment === undefined) {
            // URI is shorter than the route, no match
            // uri:   /users
            // route: /users/:userId
            missed = true;
            break;
          }

          let dynamicMatch = paramRe.exec(routeSegment);

          if (dynamicMatch && !isRootUri) {
            const value = decodeURIComponent(uriSegment);
            params[dynamicMatch[1]] = value;
          } else if (routeSegment !== uriSegment) {
            // Current segments don't match, not dynamic, not splat, so no match
            // uri:   /users/123/settings
            // route: /users/:id/profile
            missed = true;
            break;
          }
        }

        if (!missed) {
          match = {
            route,
            params,
            uri: "/" + uriSegments.slice(0, index).join("/")
          };
          break;
        }
      }

      return match || default_ || null;
    }

    /**
     * Check if the `path` matches the `uri`.
     * @param {string} path
     * @param {string} uri
     * @return {?object}
     */
    function match(route, uri) {
      return pick([route], uri);
    }

    /**
     * Combines the `basepath` and the `path` into one path.
     * @param {string} basepath
     * @param {string} path
     */
    function combinePaths(basepath, path) {
      return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
    }

    /**
     * Decides whether a given `event` should result in a navigation or not.
     * @param {object} event
     */
    function shouldNavigate(event) {
      return (
        !event.defaultPrevented &&
        event.button === 0 &&
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
      );
    }

    /* node_modules/svelte-routing/src/Router.svelte generated by Svelte v3.12.1 */

    function create_fragment$2(ctx) {
    	var current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $base, $location, $routes;

    	

      let { basepath = "/", url = null } = $$props;

      const locationContext = getContext(LOCATION);
      const routerContext = getContext(ROUTER);

      const routes = writable([]); validate_store(routes, 'routes'); component_subscribe($$self, routes, $$value => { $routes = $$value; $$invalidate('$routes', $routes); });
      const activeRoute = writable(null);
      let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

      // If locationContext is not set, this is the topmost Router in the tree.
      // If the `url` prop is given we force the location to it.
      const location =
        locationContext ||
        writable(url ? { pathname: url } : globalHistory.location); validate_store(location, 'location'); component_subscribe($$self, location, $$value => { $location = $$value; $$invalidate('$location', $location); });

      // If routerContext is set, the routerBase of the parent Router
      // will be the base for this Router's descendants.
      // If routerContext is not set, the path and resolved uri will both
      // have the value of the basepath prop.
      const base = routerContext
        ? routerContext.routerBase
        : writable({
            path: basepath,
            uri: basepath
          }); validate_store(base, 'base'); component_subscribe($$self, base, $$value => { $base = $$value; $$invalidate('$base', $base); });

      const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
        // If there is no activeRoute, the routerBase will be identical to the base.
        if (activeRoute === null) {
          return base;
        }

        const { path: basepath } = base;
        const { route, uri } = activeRoute;
        // Remove the potential /* or /*splatname from
        // the end of the child Routes relative paths.
        const path = route.default ? basepath : route.path.replace(/\*.*$/, "");

        return { path, uri };
      });

      function registerRoute(route) {
        const { path: basepath } = $base;
        let { path } = route;

        // We store the original path in the _path property so we can reuse
        // it when the basepath changes. The only thing that matters is that
        // the route reference is intact, so mutation is fine.
        route._path = path;
        route.path = combinePaths(basepath, path);

        if (typeof window === "undefined") {
          // In SSR we should set the activeRoute immediately if it is a match.
          // If there are more Routes being registered after a match is found,
          // we just skip them.
          if (hasActiveRoute) {
            return;
          }

          const matchingRoute = match(route, $location.pathname);
          if (matchingRoute) {
            activeRoute.set(matchingRoute);
            hasActiveRoute = true;
          }
        } else {
          routes.update(rs => {
            rs.push(route);
            return rs;
          });
        }
      }

      function unregisterRoute(route) {
        routes.update(rs => {
          const index = rs.indexOf(route);
          rs.splice(index, 1);
          return rs;
        });
      }

      if (!locationContext) {
        // The topmost Router in the tree is responsible for updating
        // the location store and supplying it through context.
        onMount(() => {
          const unlisten = globalHistory.listen(history => {
            location.set(history.location);
          });

          return unlisten;
        });

        setContext(LOCATION, location);
      }

      setContext(ROUTER, {
        activeRoute,
        base,
        routerBase,
        registerRoute,
        unregisterRoute
      });

    	const writable_props = ['basepath', 'url'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('basepath' in $$props) $$invalidate('basepath', basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate('url', url = $$props.url);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { basepath, url, hasActiveRoute, $base, $location, $routes };
    	};

    	$$self.$inject_state = $$props => {
    		if ('basepath' in $$props) $$invalidate('basepath', basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate('url', url = $$props.url);
    		if ('hasActiveRoute' in $$props) hasActiveRoute = $$props.hasActiveRoute;
    		if ('$base' in $$props) base.set($base);
    		if ('$location' in $$props) location.set($location);
    		if ('$routes' in $$props) routes.set($routes);
    	};

    	$$self.$$.update = ($$dirty = { $base: 1, $routes: 1, $location: 1 }) => {
    		if ($$dirty.$base) { {
            const { path: basepath } = $base;
            routes.update(rs => {
              rs.forEach(r => (r.path = combinePaths(basepath, r._path)));
              return rs;
            });
          } }
    		if ($$dirty.$routes || $$dirty.$location) { {
            const bestMatch = pick($routes, $location.pathname);
            activeRoute.set(bestMatch);
          } }
    	};

    	return {
    		basepath,
    		url,
    		routes,
    		location,
    		base,
    		$$slots,
    		$$scope
    	};
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment$2, safe_not_equal, ["basepath", "url"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Router", options, id: create_fragment$2.name });
    	}

    	get basepath() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set basepath(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-routing/src/Route.svelte generated by Svelte v3.12.1 */

    const get_default_slot_changes = ({ routeParams, $location }) => ({ params: routeParams, location: $location });
    const get_default_slot_context = ({ routeParams, $location }) => ({
    	params: routeParams,
    	location: $location
    });

    // (40:0) {#if $activeRoute !== null && $activeRoute.route === route}
    function create_if_block(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block_1,
    		create_else_block
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.component !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(40:0) {#if $activeRoute !== null && $activeRoute.route === route}", ctx });
    	return block;
    }

    // (43:2) {:else}
    function create_else_block(ctx) {
    	var current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, get_default_slot_context);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},

    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && (changed.$$scope || changed.routeParams || changed.$location)) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, get_default_slot_changes),
    					get_slot_context(default_slot_template, ctx, get_default_slot_context)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block.name, type: "else", source: "(43:2) {:else}", ctx });
    	return block;
    }

    // (41:2) {#if component !== null}
    function create_if_block_1(ctx) {
    	var switch_instance_anchor, current;

    	var switch_instance_spread_levels = [
    		{ location: ctx.$location },
    		ctx.routeParams,
    		ctx.routeProps
    	];

    	var switch_value = ctx.component;

    	function switch_props(ctx) {
    		let switch_instance_props = {};
    		for (var i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}
    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) switch_instance.$$.fragment.c();
    			switch_instance_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var switch_instance_changes = (changed.$location || changed.routeParams || changed.routeProps) ? get_spread_update(switch_instance_spread_levels, [
    									(changed.$location) && { location: ctx.$location },
    			(changed.routeParams) && get_spread_object(ctx.routeParams),
    			(changed.routeProps) && get_spread_object(ctx.routeProps)
    								]) : {};

    			if (switch_value !== (switch_value = ctx.component)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;
    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});
    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());

    					switch_instance.$$.fragment.c();
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}

    			else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(switch_instance_anchor);
    			}

    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1.name, type: "if", source: "(41:2) {#if component !== null}", ctx });
    	return block;
    }

    function create_fragment$3(ctx) {
    	var if_block_anchor, current;

    	var if_block = (ctx.$activeRoute !== null && ctx.$activeRoute.route === ctx.route) && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.$activeRoute !== null && ctx.$activeRoute.route === ctx.route) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$3.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $activeRoute, $location;

    	

      let { path = "", component = null } = $$props;

      const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER); validate_store(activeRoute, 'activeRoute'); component_subscribe($$self, activeRoute, $$value => { $activeRoute = $$value; $$invalidate('$activeRoute', $activeRoute); });
      const location = getContext(LOCATION); validate_store(location, 'location'); component_subscribe($$self, location, $$value => { $location = $$value; $$invalidate('$location', $location); });

      const route = {
        path,
        // If no path prop is given, this Route will act as the default Route
        // that is rendered if no other Route in the Router is a match.
        default: path === ""
      };
      let routeParams = {};
      let routeProps = {};

      registerRoute(route);

      // There is no need to unregister Routes in SSR since it will all be
      // thrown away anyway.
      if (typeof window !== "undefined") {
        onDestroy(() => {
          unregisterRoute(route);
        });
      }

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('path' in $$new_props) $$invalidate('path', path = $$new_props.path);
    		if ('component' in $$new_props) $$invalidate('component', component = $$new_props.component);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { path, component, routeParams, routeProps, $activeRoute, $location };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('path' in $$props) $$invalidate('path', path = $$new_props.path);
    		if ('component' in $$props) $$invalidate('component', component = $$new_props.component);
    		if ('routeParams' in $$props) $$invalidate('routeParams', routeParams = $$new_props.routeParams);
    		if ('routeProps' in $$props) $$invalidate('routeProps', routeProps = $$new_props.routeProps);
    		if ('$activeRoute' in $$props) activeRoute.set($activeRoute);
    		if ('$location' in $$props) location.set($location);
    	};

    	$$self.$$.update = ($$dirty = { $activeRoute: 1, $$props: 1 }) => {
    		if ($$dirty.$activeRoute) { if ($activeRoute && $activeRoute.route === route) {
            $$invalidate('routeParams', routeParams = $activeRoute.params);
          } }
    		{
            const { path, component, ...rest } = $$props;
            $$invalidate('routeProps', routeProps = rest);
          }
    	};

    	return {
    		path,
    		component,
    		activeRoute,
    		location,
    		route,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$3, safe_not_equal, ["path", "component"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Route", options, id: create_fragment$3.name });
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /**
     * A link action that can be added to <a href=""> tags rather
     * than using the <Link> component.
     *
     * Example:
     * ```html
     * <a href="/post/{postId}" use:link>{post.title}</a>
     * ```
     */
    function link(node) {
      function onClick(event) {
        const anchor = event.currentTarget;

        if (
          anchor.target === "" &&
          anchor.host === location.host &&
          shouldNavigate(event)
        ) {
          event.preventDefault();
          navigate(anchor.pathname, { replace: anchor.hasAttribute("replace") });
        }
      }

      node.addEventListener("click", onClick);

      return {
        destroy() {
          node.removeEventListener("click", onClick);
        }
      };
    }

    /* src/pages/ProductTemplate.svelte generated by Svelte v3.12.1 */

    const file$2 = "src/pages/ProductTemplate.svelte";

    // (40:0) {:else}
    function create_else_block$1(ctx) {
    	var current;

    	var loading = new Loading({ $$inline: true });

    	const block = {
    		c: function create() {
    			loading.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(loading, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(loading.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(loading.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(loading, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$1.name, type: "else", source: "(40:0) {:else}", ctx });
    	return block;
    }

    // (17:0) {#if product}
    function create_if_block$1(ctx) {
    	var section, a, link_action, t1, div, article0, img, img_src_value, img_alt_value, t2, article1, h1, t3_value = ctx.product.title + "", t3, t4, h2, t5, t6_value = ctx.product.price + "", t6, t7, p, t8_value = ctx.product.description + "", t8, t9, button, dispose;

    	const block = {
    		c: function create() {
    			section = element("section");
    			a = element("a");
    			a.textContent = "back to products";
    			t1 = space();
    			div = element("div");
    			article0 = element("article");
    			img = element("img");
    			t2 = space();
    			article1 = element("article");
    			h1 = element("h1");
    			t3 = text(t3_value);
    			t4 = space();
    			h2 = element("h2");
    			t5 = text("$");
    			t6 = text(t6_value);
    			t7 = space();
    			p = element("p");
    			t8 = text(t8_value);
    			t9 = space();
    			button = element("button");
    			button.textContent = "add to cart";
    			attr_dev(a, "href", "/products");
    			attr_dev(a, "class", "btn btn-primary");
    			add_location(a, file$2, 18, 4, 517);
    			attr_dev(img, "src", img_src_value = ctx.product.image);
    			attr_dev(img, "alt", img_alt_value = ctx.product.title);
    			add_location(img, file$2, 22, 8, 688);
    			attr_dev(article0, "class", "single-product-image");
    			add_location(article0, file$2, 21, 6, 641);
    			add_location(h1, file$2, 25, 8, 777);
    			add_location(h2, file$2, 26, 8, 810);
    			add_location(p, file$2, 27, 8, 844);
    			attr_dev(button, "class", "btn btn-primary btn-block");
    			add_location(button, file$2, 28, 8, 881);
    			add_location(article1, file$2, 24, 6, 759);
    			attr_dev(div, "class", "single-product-container");
    			add_location(div, file$2, 20, 4, 596);
    			attr_dev(section, "class", "single-product");
    			add_location(section, file$2, 17, 2, 480);
    			dispose = listen_dev(button, "click", ctx.click_handler);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, a);
    			link_action = link.call(null, a) || {};
    			append_dev(section, t1);
    			append_dev(section, div);
    			append_dev(div, article0);
    			append_dev(article0, img);
    			append_dev(div, t2);
    			append_dev(div, article1);
    			append_dev(article1, h1);
    			append_dev(h1, t3);
    			append_dev(article1, t4);
    			append_dev(article1, h2);
    			append_dev(h2, t5);
    			append_dev(h2, t6);
    			append_dev(article1, t7);
    			append_dev(article1, p);
    			append_dev(p, t8);
    			append_dev(article1, t9);
    			append_dev(article1, button);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.product) && img_src_value !== (img_src_value = ctx.product.image)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if ((changed.product) && img_alt_value !== (img_alt_value = ctx.product.title)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if ((changed.product) && t3_value !== (t3_value = ctx.product.title + "")) {
    				set_data_dev(t3, t3_value);
    			}

    			if ((changed.product) && t6_value !== (t6_value = ctx.product.price + "")) {
    				set_data_dev(t6, t6_value);
    			}

    			if ((changed.product) && t8_value !== (t8_value = ctx.product.description + "")) {
    				set_data_dev(t8, t8_value);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(section);
    			}

    			if (link_action && typeof link_action.destroy === 'function') link_action.destroy();
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$1.name, type: "if", source: "(17:0) {#if product}", ctx });
    	return block;
    }

    function create_fragment$4(ctx) {
    	var title_value, t, current_block_type_index, if_block, if_block_anchor, current;

    	document.title = title_value = !ctx.product ? 'singleproduct' : ctx.product.title;

    	var if_block_creators = [
    		create_if_block$1,
    		create_else_block$1
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.product) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			t = space();
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.product) && title_value !== (title_value = !ctx.product ? 'singleproduct' : ctx.product.title)) {
    				document.title = title_value;
    			}

    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}

    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$4.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $products;

    	validate_store(store$1, 'products');
    	component_subscribe($$self, store$1, $$value => { $products = $$value; $$invalidate('$products', $products); });

    	let { id, location } = $$props;

    	const writable_props = ['id', 'location'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<ProductTemplate> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    	            console.log('add oto cart');
    	            addToCart(product);
    	            store.toggleItem('cart', true);
    	          };

    	$$self.$set = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('location' in $$props) $$invalidate('location', location = $$props.location);
    	};

    	$$self.$capture_state = () => {
    		return { id, location, product, $products };
    	};

    	$$self.$inject_state = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('location' in $$props) $$invalidate('location', location = $$props.location);
    		if ('product' in $$props) $$invalidate('product', product = $$props.product);
    		if ('$products' in $$props) store$1.set($products);
    	};

    	let product;

    	$$self.$$.update = ($$dirty = { $products: 1, id: 1 }) => {
    		if ($$dirty.$products || $$dirty.id) { $$invalidate('product', product = $products.find((prod) => prod.id === parseInt(id))); }
    	};

    	return { id, location, product, click_handler };
    }

    class ProductTemplate extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$4, safe_not_equal, ["id", "location"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "ProductTemplate", options, id: create_fragment$4.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.id === undefined && !('id' in props)) {
    			console.warn("<ProductTemplate> was created without expected prop 'id'");
    		}
    		if (ctx.location === undefined && !('location' in props)) {
    			console.warn("<ProductTemplate> was created without expected prop 'location'");
    		}
    	}

    	get id() {
    		throw new Error("<ProductTemplate>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<ProductTemplate>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get location() {
    		throw new Error("<ProductTemplate>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set location(value) {
    		throw new Error("<ProductTemplate>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Products/Product.svelte generated by Svelte v3.12.1 */

    const file$3 = "src/components/Products/Product.svelte";

    function create_fragment$5(ctx) {
    	var article, div0, img, t0, a, t1, t2, div1, p0, t3, t4, p1, t5, t6;

    	const block = {
    		c: function create() {
    			article = element("article");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			a = element("a");
    			t1 = text("Details");
    			t2 = space();
    			div1 = element("div");
    			p0 = element("p");
    			t3 = text(ctx.title);
    			t4 = space();
    			p1 = element("p");
    			t5 = text("$");
    			t6 = text(ctx.price);
    			attr_dev(img, "src", ctx.image);
    			attr_dev(img, "alt", ctx.title);
    			add_location(img, file$3, 9, 4, 232);
    			attr_dev(a, "href", "/products/" + ctx.id);
    			attr_dev(a, "class", "btn btn-primary product-link");
    			add_location(a, file$3, 10, 4, 268);
    			attr_dev(div0, "class", "img-container");
    			add_location(div0, file$3, 8, 2, 200);
    			attr_dev(p0, "class", "product-title");
    			add_location(p0, file$3, 13, 4, 386);
    			attr_dev(p1, "class", "product-price");
    			add_location(p1, file$3, 14, 4, 427);
    			attr_dev(div1, "class", "product-footer");
    			add_location(div1, file$3, 12, 2, 353);
    			attr_dev(article, "class", "product");
    			add_location(article, file$3, 7, 0, 172);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, article, anchor);
    			append_dev(article, div0);
    			append_dev(div0, img);
    			append_dev(div0, t0);
    			append_dev(div0, a);
    			append_dev(a, t1);
    			append_dev(article, t2);
    			append_dev(article, div1);
    			append_dev(div1, p0);
    			append_dev(p0, t3);
    			append_dev(div1, t4);
    			append_dev(div1, p1);
    			append_dev(p1, t5);
    			append_dev(p1, t6);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(article);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$5.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	
      let { product } = $$props;
      let { title, image, price, id } = product;

    	const writable_props = ['product'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Product> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('product' in $$props) $$invalidate('product', product = $$props.product);
    	};

    	$$self.$capture_state = () => {
    		return { product, title, image, price, id };
    	};

    	$$self.$inject_state = $$props => {
    		if ('product' in $$props) $$invalidate('product', product = $$props.product);
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    		if ('image' in $$props) $$invalidate('image', image = $$props.image);
    		if ('price' in $$props) $$invalidate('price', price = $$props.price);
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    	};

    	return { product, title, image, price, id };
    }

    class Product extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$5, safe_not_equal, ["product"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Product", options, id: create_fragment$5.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.product === undefined && !('product' in props)) {
    			console.warn("<Product> was created without expected prop 'product'");
    		}
    	}

    	get product() {
    		throw new Error("<Product>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set product(value) {
    		throw new Error("<Product>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Products/Products.svelte generated by Svelte v3.12.1 */

    const file$4 = "src/components/Products/Products.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.product = list[i];
    	return child_ctx;
    }

    // (13:4) {:else}
    function create_else_block$2(ctx) {
    	var current;

    	var loading = new Loading({ $$inline: true });

    	const block = {
    		c: function create() {
    			loading.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(loading, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(loading.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(loading.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(loading, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$2.name, type: "else", source: "(13:4) {:else}", ctx });
    	return block;
    }

    // (11:4) {#each $products as product (product.id)}
    function create_each_block(key_1, ctx) {
    	var first, current;

    	var product = new Product({
    		props: { product: ctx.product },
    		$$inline: true
    	});

    	const block = {
    		key: key_1,

    		first: null,

    		c: function create() {
    			first = empty();
    			product.$$.fragment.c();
    			this.first = first;
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(product, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var product_changes = {};
    			if (changed.$products) product_changes.product = ctx.product;
    			product.$set(product_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(product.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(product.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(first);
    			}

    			destroy_component(product, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block.name, type: "each", source: "(11:4) {#each $products as product (product.id)}", ctx });
    	return block;
    }

    function create_fragment$6(ctx) {
    	var section, h2, t0, t1, div, each_blocks = [], each_1_lookup = new Map(), current;

    	let each_value = ctx.$products;

    	const get_key = ctx => ctx.product.id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	let each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block$2(ctx);
    		each_1_else.c();
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			h2 = element("h2");
    			t0 = text(ctx.title);
    			t1 = space();
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr_dev(h2, "class", "section-title");
    			add_location(h2, file$4, 8, 2, 213);
    			attr_dev(div, "class", "products-center");
    			add_location(div, file$4, 9, 2, 254);
    			attr_dev(section, "class", "section");
    			add_location(section, file$4, 7, 0, 185);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, h2);
    			append_dev(h2, t0);
    			append_dev(section, t1);
    			append_dev(section, div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			if (each_1_else) {
    				each_1_else.m(div, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!current || changed.title) {
    				set_data_dev(t0, ctx.title);
    			}

    			const each_value = ctx.$products;

    			group_outros();
    			each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block, null, get_each_context);
    			check_outros();

    			if (each_value.length) {
    				if (each_1_else) {
    					each_1_else.d(1);
    					each_1_else = null;
    				}
    			} else if (!each_1_else) {
    				each_1_else = create_else_block$2(ctx);
    				each_1_else.c();
    				each_1_else.m(div, null);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(section);
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (each_1_else) each_1_else.d();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$6.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $products;

    	validate_store(store$1, 'products');
    	component_subscribe($$self, store$1, $$value => { $products = $$value; $$invalidate('$products', $products); });

    	
      let { title = '' } = $$props;

    	const writable_props = ['title'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Products> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    	};

    	$$self.$capture_state = () => {
    		return { title, $products };
    	};

    	$$self.$inject_state = $$props => {
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    		if ('$products' in $$props) store$1.set($products);
    	};

    	return { title, $products };
    }

    class Products extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$6, safe_not_equal, ["title"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Products", options, id: create_fragment$6.name });
    	}

    	get title() {
    		throw new Error("<Products>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Products>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/pages/Products.svelte generated by Svelte v3.12.1 */

    function create_fragment$7(ctx) {
    	var current;

    	var products = new Products({
    		props: { title: "products" },
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			products.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(products, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(products.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(products.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(products, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$7.name, type: "component", source: "", ctx });
    	return block;
    }

    class Products_1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$7, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Products_1", options, id: create_fragment$7.name });
    	}
    }

    /* src/components/Hero.svelte generated by Svelte v3.12.1 */

    const file$5 = "src/components/Hero.svelte";

    function create_fragment$8(ctx) {
    	var div1, div0, h1, t1, p, t3, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Welcome to doghouse";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Your home for all things canin e";
    			t3 = space();

    			if (default_slot) default_slot.c();
    			add_location(h1, file$5, 6, 4, 107);
    			attr_dev(p, "class", "");
    			add_location(p, file$5, 7, 4, 140);

    			attr_dev(div0, "class", "banner");
    			add_location(div0, file$5, 5, 2, 82);
    			attr_dev(div1, "class", "hero");
    			add_location(div1, file$5, 4, 0, 61);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(div0_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t1);
    			append_dev(div0, p);
    			append_dev(div0, t3);

    			if (default_slot) {
    				default_slot.m(div0, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div1);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$8.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return { $$slots, $$scope };
    }

    class Hero extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$8, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Hero", options, id: create_fragment$8.name });
    	}
    }

    /* src/components/Products/Featured.svelte generated by Svelte v3.12.1 */

    const file$6 = "src/components/Products/Featured.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.product = list[i];
    	return child_ctx;
    }

    // (11:0) {:else}
    function create_else_block$3(ctx) {
    	var section, h2, t0, t1, div, each_blocks = [], each_1_lookup = new Map(), current;

    	let each_value = ctx.featured;

    	const get_key = ctx => ctx.product.id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			h2 = element("h2");
    			t0 = text(ctx.title);
    			t1 = space();
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr_dev(h2, "class", "section-title");
    			add_location(h2, file$6, 12, 4, 327);
    			attr_dev(div, "class", "products-center");
    			add_location(div, file$6, 13, 4, 370);
    			attr_dev(section, "class", "section");
    			add_location(section, file$6, 11, 2, 297);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, h2);
    			append_dev(h2, t0);
    			append_dev(section, t1);
    			append_dev(section, div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!current || changed.title) {
    				set_data_dev(t0, ctx.title);
    			}

    			const each_value = ctx.featured;

    			group_outros();
    			each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
    			check_outros();
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(section);
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$3.name, type: "else", source: "(11:0) {:else}", ctx });
    	return block;
    }

    // (9:0) {#if featured.length === -0}
    function create_if_block$2(ctx) {
    	var current;

    	var loading = new Loading({ $$inline: true });

    	const block = {
    		c: function create() {
    			loading.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(loading, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(loading.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(loading.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(loading, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$2.name, type: "if", source: "(9:0) {#if featured.length === -0}", ctx });
    	return block;
    }

    // (15:6) {#each featured as product (product.id)}
    function create_each_block$1(key_1, ctx) {
    	var first, current;

    	var product = new Product({
    		props: { product: ctx.product },
    		$$inline: true
    	});

    	const block = {
    		key: key_1,

    		first: null,

    		c: function create() {
    			first = empty();
    			product.$$.fragment.c();
    			this.first = first;
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(product, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var product_changes = {};
    			if (changed.featured) product_changes.product = ctx.product;
    			product.$set(product_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(product.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(product.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(first);
    			}

    			destroy_component(product, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$1.name, type: "each", source: "(15:6) {#each featured as product (product.id)}", ctx });
    	return block;
    }

    function create_fragment$9(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block$2,
    		create_else_block$3
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.featured.length === -0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$9.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $products;

    	validate_store(store$1, 'products');
    	component_subscribe($$self, store$1, $$value => { $products = $$value; $$invalidate('$products', $products); });

    	
      let { title = '' } = $$props;

    	const writable_props = ['title'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Featured> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    	};

    	$$self.$capture_state = () => {
    		return { title, featured, $products };
    	};

    	$$self.$inject_state = $$props => {
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    		if ('featured' in $$props) $$invalidate('featured', featured = $$props.featured);
    		if ('$products' in $$props) store$1.set($products);
    	};

    	let featured;

    	$$self.$$.update = ($$dirty = { $products: 1 }) => {
    		if ($$dirty.$products) { $$invalidate('featured', featured = $products.filter((item) => item.featured)); }
    	};

    	return { title, featured };
    }

    class Featured extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$9, safe_not_equal, ["title"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Featured", options, id: create_fragment$9.name });
    	}

    	get title() {
    		throw new Error("<Featured>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Featured>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/pages/Home.svelte generated by Svelte v3.12.1 */

    const file$7 = "src/pages/Home.svelte";

    // (8:0) <Hero>
    function create_default_slot(ctx) {
    	var a, link_action;

    	const block = {
    		c: function create() {
    			a = element("a");
    			a.textContent = "shop now";
    			attr_dev(a, "href", "products");
    			attr_dev(a, "class", "btn btn-primary btn-hero");
    			add_location(a, file$7, 8, 2, 206);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			link_action = link.call(null, a) || {};
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}

    			if (link_action && typeof link_action.destroy === 'function') link_action.destroy();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot.name, type: "slot", source: "(8:0) <Hero>", ctx });
    	return block;
    }

    function create_fragment$a(ctx) {
    	var t, current;

    	var hero = new Hero({
    		props: {
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var featured = new Featured({
    		props: { title: "featured products" },
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			hero.$$.fragment.c();
    			t = space();
    			featured.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(hero, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(featured, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var hero_changes = {};
    			if (changed.$$scope) hero_changes.$$scope = { changed, ctx };
    			hero.$set(hero_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(hero.$$.fragment, local);

    			transition_in(featured.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(hero.$$.fragment, local);
    			transition_out(featured.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(hero, detaching);

    			if (detaching) {
    				detach_dev(t);
    			}

    			destroy_component(featured, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$a.name, type: "component", source: "", ctx });
    	return block;
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$a, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Home", options, id: create_fragment$a.name });
    	}
    }

    /* src/pages/About.svelte generated by Svelte v3.12.1 */

    const file$8 = "src/pages/About.svelte";

    function create_fragment$b(ctx) {
    	var h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "welcome to about page";
    			add_location(h1, file$8, 0, 0, 0);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$b.name, type: "component", source: "", ctx });
    	return block;
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$b, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "About", options, id: create_fragment$b.name });
    	}
    }

    /* src/components/Cart/CartButton.svelte generated by Svelte v3.12.1 */

    const file$9 = "src/components/Cart/CartButton.svelte";

    function create_fragment$c(ctx) {
    	var div, button, i, t0, span, t1, dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			i = element("i");
    			t0 = space();
    			span = element("span");
    			t1 = text(ctx.total);
    			attr_dev(i, "class", "fas fa-cart-plus");
    			add_location(i, file$9, 17, 4, 405);
    			attr_dev(button, "ckass", "btn-cart-toggle");
    			add_location(button, file$9, 11, 2, 300);
    			attr_dev(span, "class", "btn-cart-items");
    			add_location(span, file$9, 19, 2, 450);
    			attr_dev(div, "class", "btn-cart-container");
    			add_location(div, file$9, 10, 0, 265);
    			dispose = listen_dev(button, "click", ctx.click_handler);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			append_dev(button, i);
    			append_dev(div, t0);
    			append_dev(div, span);
    			append_dev(span, t1);
    		},

    		p: function update(changed, ctx) {
    			if (changed.total) {
    				set_data_dev(t1, ctx.total);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$c.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $cartStore;

    	validate_store(cart, 'cartStore');
    	component_subscribe($$self, cart, $$value => { $cartStore = $$value; $$invalidate('$cartStore', $cartStore); });

    	
      let toggleCart = store.toggleItem;

    	const click_handler = () => {
    	      toggleCart('cart', true);
    	    };

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('toggleCart' in $$props) $$invalidate('toggleCart', toggleCart = $$props.toggleCart);
    		if ('total' in $$props) $$invalidate('total', total = $$props.total);
    		if ('$cartStore' in $$props) cart.set($cartStore);
    	};

    	let total;

    	$$self.$$.update = ($$dirty = { $cartStore: 1 }) => {
    		if ($$dirty.$cartStore) { $$invalidate('total', total = $cartStore.reduce((total, item) => {
            total += item.amount;
            return total;
          }, 0)); }
    	};

    	return { toggleCart, total, click_handler };
    }

    class CartButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$c, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "CartButton", options, id: create_fragment$c.name });
    	}
    }

    /* src/components/Navbar/SmallNavbar.svelte generated by Svelte v3.12.1 */

    const file$a = "src/components/Navbar/SmallNavbar.svelte";

    function create_fragment$d(ctx) {
    	var nav, div, button, i, t0, a, img, link_action, t1, current, dispose;

    	var cartbutton = new CartButton({ $$inline: true });

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			div = element("div");
    			button = element("button");
    			i = element("i");
    			t0 = space();
    			a = element("a");
    			img = element("img");
    			t1 = space();
    			cartbutton.$$.fragment.c();
    			attr_dev(i, "class", "fas fa-bars");
    			add_location(i, file$a, 18, 6, 449);
    			attr_dev(button, "class", "btn-sidebar-toggle");
    			add_location(button, file$a, 12, 4, 325);
    			attr_dev(img, "src", "/assets/images/logo.svg");
    			attr_dev(img, "class", "logo");
    			attr_dev(img, "alt", "razors logo");
    			add_location(img, file$a, 21, 6, 538);
    			attr_dev(a, "href", "/");
    			attr_dev(a, "class", "nav-logo");
    			add_location(a, file$a, 20, 4, 493);
    			attr_dev(div, "class", "nav-center");
    			add_location(div, file$a, 10, 2, 269);
    			attr_dev(nav, "class", "navbar");
    			add_location(nav, file$a, 9, 0, 246);
    			dispose = listen_dev(button, "click", ctx.click_handler);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div);
    			append_dev(div, button);
    			append_dev(button, i);
    			append_dev(div, t0);
    			append_dev(div, a);
    			append_dev(a, img);
    			link_action = link.call(null, a) || {};
    			append_dev(div, t1);
    			mount_component(cartbutton, div, null);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(cartbutton.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(cartbutton.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(nav);
    			}

    			if (link_action && typeof link_action.destroy === 'function') link_action.destroy();

    			destroy_component(cartbutton);

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$d.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$8($$self) {
    	
      let openSidebar = store.toggleItem;

    	const click_handler = () => {
    	        openSidebar('sidebar', true);
    	      };

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('openSidebar' in $$props) $$invalidate('openSidebar', openSidebar = $$props.openSidebar);
    	};

    	return { openSidebar, click_handler };
    }

    class SmallNavbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$d, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "SmallNavbar", options, id: create_fragment$d.name });
    	}
    }

    var links = [
      { text: 'home', url: '/' },
      { text: 'products', url: '/products' },
      { text: 'about', url: '/about' }
    ];

    const user = writable({ username: null, jwt: null });

    /* src/components/LoginLink.svelte generated by Svelte v3.12.1 */

    const file$b = "src/components/LoginLink.svelte";

    // (16:0) {:else}
    function create_else_block$4(ctx) {
    	var a, dispose;

    	const block = {
    		c: function create() {
    			a = element("a");
    			a.textContent = "Login";
    			attr_dev(a, "href", "/login");
    			add_location(a, file$b, 16, 2, 324);
    			dispose = listen_dev(a, "click", ctx.click_handler_1);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$4.name, type: "else", source: "(16:0) {:else}", ctx });
    	return block;
    }

    // (8:0) {#if user.jwt}
    function create_if_block$3(ctx) {
    	var a, dispose;

    	const block = {
    		c: function create() {
    			a = element("a");
    			a.textContent = "Logout";
    			attr_dev(a, "href", "/");
    			attr_dev(a, "class", "logout-btn");
    			add_location(a, file$b, 8, 2, 184);
    			dispose = listen_dev(a, "click", ctx.click_handler);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$3.name, type: "if", source: "(8:0) {#if user.jwt}", ctx });
    	return block;
    }

    function create_fragment$e(ctx) {
    	var if_block_anchor;

    	function select_block_type(changed, ctx) {
    		if (user.jwt) return create_if_block$3;
    		return create_else_block$4;
    	}

    	var current_block_type = select_block_type();
    	var if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$e.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$9($$self) {
    	const click_handler = () => {
    	      store.toggleItem('sidebar', false);
    	    };

    	const click_handler_1 = () => {
    	      store.toggleItem('sidebar', false);
    	    };

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return { click_handler, click_handler_1 };
    }

    class LoginLink extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$e, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "LoginLink", options, id: create_fragment$e.name });
    	}
    }

    /* src/components/Navbar/BigNavbar.svelte generated by Svelte v3.12.1 */

    const file$c = "src/components/Navbar/BigNavbar.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.navLink = list[i];
    	return child_ctx;
    }

    // (12:8) {#each links as navLink}
    function create_each_block$2(ctx) {
    	var li, a, t_value = ctx.navLink.text + "", t, link_action;

    	const block = {
    		c: function create() {
    			li = element("li");
    			a = element("a");
    			t = text(t_value);
    			attr_dev(a, "href", ctx.navLink.url);
    			attr_dev(a, "class", "");
    			add_location(a, file$c, 12, 14, 363);
    			add_location(li, file$c, 12, 10, 359);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, a);
    			append_dev(a, t);
    			link_action = link.call(null, a) || {};
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(li);
    			}

    			if (link_action && typeof link_action.destroy === 'function') link_action.destroy();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$2.name, type: "each", source: "(12:8) {#each links as navLink}", ctx });
    	return block;
    }

    function create_fragment$f(ctx) {
    	var nav, div2, div1, ul, t0, a, img, link_action, t1, div0, t2, current;

    	let each_value = links;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	var loginlink = new LoginLink({ $$inline: true });

    	var cartbutton = new CartButton({ $$inline: true });

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			div2 = element("div");
    			div1 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			a = element("a");
    			img = element("img");
    			t1 = space();
    			div0 = element("div");
    			loginlink.$$.fragment.c();
    			t2 = space();
    			cartbutton.$$.fragment.c();
    			attr_dev(ul, "class", "nav-links");
    			add_location(ul, file$c, 10, 6, 293);
    			attr_dev(img, "src", "/assets/images/logo.svg");
    			attr_dev(img, "alt", "");
    			add_location(img, file$c, 17, 8, 518);
    			attr_dev(a, "href", "/");
    			attr_dev(a, "class", "nav-logo big-logo");
    			add_location(a, file$c, 16, 6, 462);
    			attr_dev(div0, "class", "nav-aside");
    			add_location(div0, file$c, 19, 6, 580);
    			attr_dev(div1, "class", "nav-center");
    			add_location(div1, file$c, 9, 4, 262);
    			attr_dev(div2, "class", "nav-container");
    			add_location(div2, file$c, 8, 2, 230);
    			attr_dev(nav, "class", "navbar");
    			add_location(nav, file$c, 7, 0, 207);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div2);
    			append_dev(div2, div1);
    			append_dev(div1, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(div1, t0);
    			append_dev(div1, a);
    			append_dev(a, img);
    			link_action = link.call(null, a) || {};
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			mount_component(loginlink, div0, null);
    			append_dev(div0, t2);
    			mount_component(cartbutton, div0, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.links) {
    				each_value = links;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(loginlink.$$.fragment, local);

    			transition_in(cartbutton.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(loginlink.$$.fragment, local);
    			transition_out(cartbutton.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(nav);
    			}

    			destroy_each(each_blocks, detaching);

    			if (link_action && typeof link_action.destroy === 'function') link_action.destroy();

    			destroy_component(loginlink);

    			destroy_component(cartbutton);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$f.name, type: "component", source: "", ctx });
    	return block;
    }

    class BigNavbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$f, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "BigNavbar", options, id: create_fragment$f.name });
    	}
    }

    /* src/components/Navbar/Navbar.svelte generated by Svelte v3.12.1 */

    // (15:0) {:else}
    function create_else_block$5(ctx) {
    	var current;

    	var smallnavbar = new SmallNavbar({ $$inline: true });

    	const block = {
    		c: function create() {
    			smallnavbar.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(smallnavbar, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(smallnavbar.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(smallnavbar.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(smallnavbar, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$5.name, type: "else", source: "(15:0) {:else}", ctx });
    	return block;
    }

    // (13:0) {#if screenWidth > 992}
    function create_if_block$4(ctx) {
    	var current;

    	var bignavbar = new BigNavbar({ $$inline: true });

    	const block = {
    		c: function create() {
    			bignavbar.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(bignavbar, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(bignavbar.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(bignavbar.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(bignavbar, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$4.name, type: "if", source: "(13:0) {#if screenWidth > 992}", ctx });
    	return block;
    }

    function create_fragment$g(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current, dispose;

    	add_render_callback(ctx.onwindowresize);

    	var if_block_creators = [
    		create_if_block$4,
    		create_else_block$5
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.screenWidth > 992) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    			dispose = listen_dev(window, "resize", ctx.onwindowresize);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index !== previous_block_index) {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$g.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	
      let screenWidth;

    	function onwindowresize() {
    		screenWidth = window.innerWidth; $$invalidate('screenWidth', screenWidth);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('screenWidth' in $$props) $$invalidate('screenWidth', screenWidth = $$props.screenWidth);
    	};

    	$$self.$$.update = ($$dirty = { screenWidth: 1 }) => {
    		if ($$dirty.screenWidth) { if (screenWidth > 992) {
            store.toggleItem('sidebar', false);
          } }
    	};

    	return { screenWidth, onwindowresize };
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$g, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Navbar", options, id: create_fragment$g.name });
    	}
    }

    function cubicInOut(t) {
        return t < 0.5 ? 4.0 * t * t * t : 0.5 * Math.pow(2.0 * t - 2.0, 3.0) + 1.0;
    }
    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function blur(node, { delay = 0, duration = 400, easing = cubicInOut, amount = 5, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const f = style.filter === 'none' ? '' : style.filter;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (_t, u) => `opacity: ${target_opacity - (od * u)}; filter: ${f} blur(${u * amount}px);`
        };
    }
    function fade(node, { delay = 0, duration = 400 }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    /* src/components/Navbar/Sidebar.svelte generated by Svelte v3.12.1 */

    const file$d = "src/components/Navbar/Sidebar.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.sideLink = list[i];
    	return child_ctx;
    }

    // (23:6) {#each links as sideLink}
    function create_each_block$3(ctx) {
    	var li, a, t_value = ctx.sideLink.text + "", t, link_action, dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			a = element("a");
    			t = text(t_value);
    			attr_dev(a, "href", ctx.sideLink.url);
    			add_location(a, file$d, 24, 10, 797);
    			add_location(li, file$d, 23, 8, 782);
    			dispose = listen_dev(a, "click", ctx.click_handler_1);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, a);
    			append_dev(a, t);
    			link_action = link.call(null, a) || {};
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(li);
    			}

    			if (link_action && typeof link_action.destroy === 'function') link_action.destroy();
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$3.name, type: "each", source: "(23:6) {#each links as sideLink}", ctx });
    	return block;
    }

    function create_fragment$h(ctx) {
    	var div2, div1, div0, button, i, t0, img, t1, ul, t2, li, div1_transition, div2_transition, current, dispose;

    	let each_value = links;

    	let each_blocks = [];

    	for (let i_1 = 0; i_1 < each_value.length; i_1 += 1) {
    		each_blocks[i_1] = create_each_block$3(get_each_context$3(ctx, each_value, i_1));
    	}

    	var loginlink = new LoginLink({ $$inline: true });

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			button = element("button");
    			i = element("i");
    			t0 = space();
    			img = element("img");
    			t1 = space();
    			ul = element("ul");

    			for (let i_1 = 0; i_1 < each_blocks.length; i_1 += 1) {
    				each_blocks[i_1].c();
    			}

    			t2 = space();
    			li = element("li");
    			loginlink.$$.fragment.c();
    			attr_dev(i, "class", "fas fa-window-close");
    			add_location(i, file$d, 13, 8, 542);
    			attr_dev(button, "class", "btn-close");
    			add_location(button, file$d, 12, 6, 459);
    			attr_dev(div0, "class", "sidebar-header");
    			add_location(div0, file$d, 11, 4, 424);
    			attr_dev(img, "src", "/assets/images/logo.svg");
    			attr_dev(img, "class", "logo sidebar-logo");
    			attr_dev(img, "alt", "razors logo");
    			add_location(img, file$d, 16, 4, 607);
    			add_location(li, file$d, 32, 6, 1002);
    			attr_dev(ul, "class", "sidebar-links");
    			add_location(ul, file$d, 21, 4, 715);
    			attr_dev(div1, "class", "sidebar");
    			add_location(div1, file$d, 10, 2, 365);
    			attr_dev(div2, "class", "sidebar-container");
    			add_location(div2, file$d, 9, 0, 301);
    			dispose = listen_dev(button, "click", ctx.click_handler);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, button);
    			append_dev(button, i);
    			append_dev(div1, t0);
    			append_dev(div1, img);
    			append_dev(div1, t1);
    			append_dev(div1, ul);

    			for (let i_1 = 0; i_1 < each_blocks.length; i_1 += 1) {
    				each_blocks[i_1].m(ul, null);
    			}

    			append_dev(ul, t2);
    			append_dev(ul, li);
    			mount_component(loginlink, li, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.links) {
    				each_value = links;

    				let i_1;
    				for (i_1 = 0; i_1 < each_value.length; i_1 += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i_1);

    					if (each_blocks[i_1]) {
    						each_blocks[i_1].p(changed, child_ctx);
    					} else {
    						each_blocks[i_1] = create_each_block$3(child_ctx);
    						each_blocks[i_1].c();
    						each_blocks[i_1].m(ul, t2);
    					}
    				}

    				for (; i_1 < each_blocks.length; i_1 += 1) {
    					each_blocks[i_1].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(loginlink.$$.fragment, local);

    			add_render_callback(() => {
    				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { delay: 400 }, true);
    				div1_transition.run(1);
    			});

    			add_render_callback(() => {
    				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fly, { x: -1000 }, true);
    				div2_transition.run(1);
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(loginlink.$$.fragment, local);

    			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { delay: 400 }, false);
    			div1_transition.run(0);

    			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fly, { x: -1000 }, false);
    			div2_transition.run(0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div2);
    			}

    			destroy_each(each_blocks, detaching);

    			destroy_component(loginlink);

    			if (detaching) {
    				if (div1_transition) div1_transition.end();
    				if (div2_transition) div2_transition.end();
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$h.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$b($$self) {
    	
      let closeSidebar = store.toggleItem;

    	const click_handler = () => closeSidebar('sidebar', false);

    	const click_handler_1 = () => {
    	              closeSidebar('sidebar', false);
    	            };

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('closeSidebar' in $$props) $$invalidate('closeSidebar', closeSidebar = $$props.closeSidebar);
    	};

    	return {
    		closeSidebar,
    		click_handler,
    		click_handler_1
    	};
    }

    class Sidebar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$h, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Sidebar", options, id: create_fragment$h.name });
    	}
    }

    /* src/components/Cart/CartItem.svelte generated by Svelte v3.12.1 */

    const file$e = "src/components/Cart/CartItem.svelte";

    function create_fragment$i(ctx) {
    	var div2, img, t0, div0, h4, t1, t2, h5, t3, t4, button0, t6, div1, button1, i0, t7, p, t8, t9, button2, i1, dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			img = element("img");
    			t0 = space();
    			div0 = element("div");
    			h4 = element("h4");
    			t1 = text(ctx.title);
    			t2 = space();
    			h5 = element("h5");
    			t3 = text(ctx.price);
    			t4 = space();
    			button0 = element("button");
    			button0.textContent = "remove";
    			t6 = space();
    			div1 = element("div");
    			button1 = element("button");
    			i0 = element("i");
    			t7 = space();
    			p = element("p");
    			t8 = text(ctx.amount);
    			t9 = space();
    			button2 = element("button");
    			i1 = element("i");
    			attr_dev(img, "src", ctx.image);
    			attr_dev(img, "alt", ctx.title);
    			add_location(img, file$e, 16, 2, 267);
    			add_location(h4, file$e, 18, 4, 320);
    			add_location(h5, file$e, 19, 4, 341);
    			attr_dev(button0, "class", "cart-btn remove-btn");
    			add_location(button0, file$e, 20, 4, 362);
    			attr_dev(div0, "class", "");
    			add_location(div0, file$e, 17, 2, 301);
    			attr_dev(i0, "class", "fas fa-chevron-up");
    			add_location(i0, file$e, 35, 6, 656);
    			attr_dev(button1, "class", "cart-btn amount-btn");
    			add_location(button1, file$e, 28, 4, 503);
    			attr_dev(p, "class", "item-amount");
    			add_location(p, file$e, 37, 4, 706);
    			attr_dev(i1, "class", "fas fa-chevron-down");
    			add_location(i1, file$e, 45, 6, 907);
    			attr_dev(button2, "class", "cart-btn remove-btn");
    			add_location(button2, file$e, 38, 4, 746);
    			add_location(div1, file$e, 27, 2, 493);
    			attr_dev(div2, "class", "cart-item");
    			add_location(div2, file$e, 15, 0, 241);

    			dispose = [
    				listen_dev(button0, "click", ctx.click_handler),
    				listen_dev(button1, "click", ctx.click_handler_1),
    				listen_dev(button2, "click", ctx.click_handler_2)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, img);
    			append_dev(div2, t0);
    			append_dev(div2, div0);
    			append_dev(div0, h4);
    			append_dev(h4, t1);
    			append_dev(div0, t2);
    			append_dev(div0, h5);
    			append_dev(h5, t3);
    			append_dev(div0, t4);
    			append_dev(div0, button0);
    			append_dev(div2, t6);
    			append_dev(div2, div1);
    			append_dev(div1, button1);
    			append_dev(button1, i0);
    			append_dev(div1, t7);
    			append_dev(div1, p);
    			append_dev(p, t8);
    			append_dev(div1, t9);
    			append_dev(div1, button2);
    			append_dev(button2, i1);
    		},

    		p: function update(changed, ctx) {
    			if (changed.image) {
    				attr_dev(img, "src", ctx.image);
    			}

    			if (changed.title) {
    				attr_dev(img, "alt", ctx.title);
    				set_data_dev(t1, ctx.title);
    			}

    			if (changed.price) {
    				set_data_dev(t3, ctx.price);
    			}

    			if (changed.amount) {
    				set_data_dev(t8, ctx.amount);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div2);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$i.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { id, image, title, price, amount } = $$props;

    	const writable_props = ['id', 'image', 'title', 'price', 'amount'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<CartItem> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    	        removeItem(id);
    	      };

    	const click_handler_1 = () => {
    	        console.log('increase item');
    	        increaseAmount(id);
    	      };

    	const click_handler_2 = () => {
    	        console.log('decrease item');
    	        decreaseAmount(id, amount);
    	      };

    	$$self.$set = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('image' in $$props) $$invalidate('image', image = $$props.image);
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    		if ('price' in $$props) $$invalidate('price', price = $$props.price);
    		if ('amount' in $$props) $$invalidate('amount', amount = $$props.amount);
    	};

    	$$self.$capture_state = () => {
    		return { id, image, title, price, amount };
    	};

    	$$self.$inject_state = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('image' in $$props) $$invalidate('image', image = $$props.image);
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    		if ('price' in $$props) $$invalidate('price', price = $$props.price);
    		if ('amount' in $$props) $$invalidate('amount', amount = $$props.amount);
    	};

    	return {
    		id,
    		image,
    		title,
    		price,
    		amount,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	};
    }

    class CartItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$i, safe_not_equal, ["id", "image", "title", "price", "amount"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "CartItem", options, id: create_fragment$i.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.id === undefined && !('id' in props)) {
    			console.warn("<CartItem> was created without expected prop 'id'");
    		}
    		if (ctx.image === undefined && !('image' in props)) {
    			console.warn("<CartItem> was created without expected prop 'image'");
    		}
    		if (ctx.title === undefined && !('title' in props)) {
    			console.warn("<CartItem> was created without expected prop 'title'");
    		}
    		if (ctx.price === undefined && !('price' in props)) {
    			console.warn("<CartItem> was created without expected prop 'price'");
    		}
    		if (ctx.amount === undefined && !('amount' in props)) {
    			console.warn("<CartItem> was created without expected prop 'amount'");
    		}
    	}

    	get id() {
    		throw new Error("<CartItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<CartItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get image() {
    		throw new Error("<CartItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set image(value) {
    		throw new Error("<CartItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<CartItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<CartItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get price() {
    		throw new Error("<CartItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set price(value) {
    		throw new Error("<CartItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get amount() {
    		throw new Error("<CartItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set amount(value) {
    		throw new Error("<CartItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function flip(node, animation, params) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const dx = animation.from.left - animation.to.left;
        const dy = animation.from.top - animation.to.top;
        const d = Math.sqrt(dx * dx + dy * dy);
        const { delay = 0, duration = d => Math.sqrt(d) * 120, easing = cubicOut } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(d) : duration,
            easing,
            css: (_t, u) => `transform: ${transform} translate(${u * dx}px, ${u * dy}px);`
        };
    }

    /* src/components/Cart/CartItems.svelte generated by Svelte v3.12.1 */

    const file$f = "src/components/Cart/CartItems.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.cartItem = list[i];
    	child_ctx.index = i;
    	return child_ctx;
    }

    // (23:4) {:else}
    function create_else_block$6(ctx) {
    	var h2;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "is currently empty";
    			attr_dev(h2, "class", "empty-cart");
    			add_location(h2, file$f, 23, 6, 597);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h2);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$6.name, type: "else", source: "(23:4) {:else}", ctx });
    	return block;
    }

    // (15:4) {#each $cart as cartItem, index (cartItem.id)}
    function create_each_block$4(key_1, ctx) {
    	var div, t, div_intro, div_outro, rect, stop_animation = noop, current;

    	var cartitem_spread_levels = [
    		ctx.cartItem
    	];

    	let cartitem_props = {};
    	for (var i = 0; i < cartitem_spread_levels.length; i += 1) {
    		cartitem_props = assign(cartitem_props, cartitem_spread_levels[i]);
    	}
    	var cartitem = new CartItem({ props: cartitem_props, $$inline: true });

    	const block = {
    		key: key_1,

    		first: null,

    		c: function create() {
    			div = element("div");
    			cartitem.$$.fragment.c();
    			t = space();
    			add_location(div, file$f, 15, 6, 413);
    			this.first = div;
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(cartitem, div, null);
    			append_dev(div, t);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var cartitem_changes = (changed.$cart) ? get_spread_update(cartitem_spread_levels, [
    									get_spread_object(ctx.cartItem)
    								]) : {};
    			cartitem.$set(cartitem_changes);
    		},

    		r: function measure_1() {
    			rect = div.getBoundingClientRect();
    		},

    		f: function fix() {
    			fix_position(div);
    			stop_animation();
    			add_transform(div, rect);
    		},

    		a: function animate() {
    			stop_animation();
    			stop_animation = create_animation(div, rect, flip, {});
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(cartitem.$$.fragment, local);

    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, fly, { delay: (ctx.index + 1) * 500, x: 100 });
    				div_intro.start();
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(cartitem.$$.fragment, local);
    			if (div_intro) div_intro.invalidate();

    			div_outro = create_out_transition(div, fly, { x: -100 });

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			destroy_component(cartitem);

    			if (detaching) {
    				if (div_outro) div_outro.end();
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$4.name, type: "each", source: "(15:4) {#each $cart as cartItem, index (cartItem.id)}", ctx });
    	return block;
    }

    function create_fragment$j(ctx) {
    	var section, article, each_blocks = [], each_1_lookup = new Map(), t0, h3, t1, t2, current;

    	let each_value = ctx.$cart;

    	const get_key = ctx => ctx.cartItem.id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$4(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$4(key, child_ctx));
    	}

    	let each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block$6(ctx);
    		each_1_else.c();
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			article = element("article");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			h3 = element("h3");
    			t1 = text("total: $");
    			t2 = text(ctx.$cartTotal);
    			add_location(article, file$f, 13, 2, 346);
    			attr_dev(h3, "class", "cart-total");
    			add_location(h3, file$f, 26, 2, 671);
    			attr_dev(section, "class", "cart-items");
    			add_location(section, file$f, 12, 0, 315);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, article);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(article, null);
    			}

    			if (each_1_else) {
    				each_1_else.m(article, null);
    			}

    			append_dev(section, t0);
    			append_dev(section, h3);
    			append_dev(h3, t1);
    			append_dev(h3, t2);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			const each_value = ctx.$cart;

    			group_outros();
    			for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
    			each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each_1_lookup, article, fix_and_outro_and_destroy_block, create_each_block$4, null, get_each_context$4);
    			for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
    			check_outros();

    			if (each_value.length) {
    				if (each_1_else) {
    					each_1_else.d(1);
    					each_1_else = null;
    				}
    			} else if (!each_1_else) {
    				each_1_else = create_else_block$6(ctx);
    				each_1_else.c();
    				each_1_else.m(article, null);
    			}

    			if (!current || changed.$cartTotal) {
    				set_data_dev(t2, ctx.$cartTotal);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(section);
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (each_1_else) each_1_else.d();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$j.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let $cart, $cartTotal;

    	validate_store(cart, 'cart');
    	component_subscribe($$self, cart, $$value => { $cart = $$value; $$invalidate('$cart', $cart); });
    	validate_store(cartTotal, 'cartTotal');
    	component_subscribe($$self, cartTotal, $$value => { $cartTotal = $$value; $$invalidate('$cartTotal', $cartTotal); });

    	

      afterUpdate(() => {
        setStorageCart($cart);
      });

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('$cart' in $$props) cart.set($cart);
    		if ('$cartTotal' in $$props) cartTotal.set($cartTotal);
    	};

    	return { $cart, $cartTotal };
    }

    class CartItems extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$j, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "CartItems", options, id: create_fragment$j.name });
    	}
    }

    /* src/components/Cart/Cart.svelte generated by Svelte v3.12.1 */

    const file$g = "src/components/Cart/Cart.svelte";

    // (42:8) {:else}
    function create_else_block$7(ctx) {
    	var t, a, link_action, dispose;

    	const block = {
    		c: function create() {
    			t = text("in order to checkout please ");
    			a = element("a");
    			a.textContent = "login";
    			attr_dev(a, "href", "/login");
    			add_location(a, file$g, 42, 38, 1129);
    			dispose = listen_dev(a, "click", ctx.click_handler_2);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			insert_dev(target, a, anchor);
    			link_action = link.call(null, a) || {};
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    				detach_dev(a);
    			}

    			if (link_action && typeof link_action.destroy === 'function') link_action.destroy();
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$7.name, type: "else", source: "(42:8) {:else}", ctx });
    	return block;
    }

    // (33:8) {#if $user.jwt}
    function create_if_block$5(ctx) {
    	var a, link_action, dispose;

    	const block = {
    		c: function create() {
    			a = element("a");
    			a.textContent = "checkout";
    			attr_dev(a, "href", "/checkout");
    			attr_dev(a, "class", "btn btn-primary btn-block");
    			add_location(a, file$g, 33, 10, 867);
    			dispose = listen_dev(a, "click", ctx.click_handler_1);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			link_action = link.call(null, a) || {};
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}

    			if (link_action && typeof link_action.destroy === 'function') link_action.destroy();
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$5.name, type: "if", source: "(33:8) {#if $user.jwt}", ctx });
    	return block;
    }

    function create_fragment$k(ctx) {
    	var div4, div3, div2, div0, button, i, t0, h2, t2, span, t3, t4, div1, div2_transition, div3_transition, div4_transition, current, dispose;

    	var cartitems = new CartItems({ $$inline: true });

    	function select_block_type(changed, ctx) {
    		if (ctx.$user.jwt) return create_if_block$5;
    		return create_else_block$7;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			button = element("button");
    			i = element("i");
    			t0 = space();
    			h2 = element("h2");
    			h2.textContent = "your bag";
    			t2 = space();
    			span = element("span");
    			t3 = space();
    			cartitems.$$.fragment.c();
    			t4 = space();
    			div1 = element("div");
    			if_block.c();
    			attr_dev(i, "class", "fas fa-window-close");
    			add_location(i, file$g, 22, 10, 651);
    			attr_dev(button, "class", "btn btn-close");
    			add_location(button, file$g, 16, 8, 512);
    			attr_dev(h2, "class", "cart-title");
    			add_location(h2, file$g, 25, 8, 712);
    			add_location(span, file$g, 26, 8, 757);
    			attr_dev(div0, "class", "cart-header");
    			add_location(div0, file$g, 15, 6, 478);
    			attr_dev(div1, "class", "cart-footer");
    			add_location(div1, file$g, 31, 6, 807);
    			attr_dev(div2, "class", "cart");
    			add_location(div2, file$g, 14, 4, 420);
    			attr_dev(div3, "class", "cart-container");
    			add_location(div3, file$g, 13, 2, 359);
    			attr_dev(div4, "class", "cart-overlay");
    			add_location(div4, file$g, 12, 0, 314);
    			dispose = listen_dev(button, "click", ctx.click_handler);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, button);
    			append_dev(button, i);
    			append_dev(div0, t0);
    			append_dev(div0, h2);
    			append_dev(div0, t2);
    			append_dev(div0, span);
    			append_dev(div2, t3);
    			mount_component(cartitems, div2, null);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			if_block.m(div1, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (current_block_type !== (current_block_type = select_block_type(changed, ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);
    				if (if_block) {
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(cartitems.$$.fragment, local);

    			add_render_callback(() => {
    				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, { delay: 400 }, true);
    				div2_transition.run(1);
    			});

    			add_render_callback(() => {
    				if (!div3_transition) div3_transition = create_bidirectional_transition(div3, fly, { x: 100 }, true);
    				div3_transition.run(1);
    			});

    			add_render_callback(() => {
    				if (!div4_transition) div4_transition = create_bidirectional_transition(div4, blur, {}, true);
    				div4_transition.run(1);
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(cartitems.$$.fragment, local);

    			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, { delay: 400 }, false);
    			div2_transition.run(0);

    			if (!div3_transition) div3_transition = create_bidirectional_transition(div3, fly, { x: 100 }, false);
    			div3_transition.run(0);

    			if (!div4_transition) div4_transition = create_bidirectional_transition(div4, blur, {}, false);
    			div4_transition.run(0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div4);
    			}

    			destroy_component(cartitems);

    			if_block.d();

    			if (detaching) {
    				if (div2_transition) div2_transition.end();
    				if (div3_transition) div3_transition.end();
    				if (div4_transition) div4_transition.end();
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$k.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let $user;

    	validate_store(user, 'user');
    	component_subscribe($$self, user, $$value => { $user = $$value; $$invalidate('$user', $user); });

    	

      let closeCart = store.toggleItem;

    	const click_handler = () => {
    	            closeCart('cart', false);
    	          };

    	const click_handler_1 = () => {
    	              closeCart('cart', false);
    	            };

    	const click_handler_2 = () => {
    	              closeCart('cart', false);
    	            };

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('closeCart' in $$props) $$invalidate('closeCart', closeCart = $$props.closeCart);
    		if ('$user' in $$props) user.set($user);
    	};

    	return {
    		closeCart,
    		$user,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	};
    }

    class Cart extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$k, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Cart", options, id: create_fragment$k.name });
    	}
    }

    /* src/App.svelte generated by Svelte v3.12.1 */

    // (20:2) {#if $globalStore.sidebar}
    function create_if_block_1$1(ctx) {
    	var current;

    	var sidebar = new Sidebar({ $$inline: true });

    	const block = {
    		c: function create() {
    			sidebar.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(sidebar, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(sidebar.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(sidebar.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(sidebar, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$1.name, type: "if", source: "(20:2) {#if $globalStore.sidebar}", ctx });
    	return block;
    }

    // (24:2) {#if $globalStore.cart}
    function create_if_block$6(ctx) {
    	var current;

    	var cart = new Cart({ $$inline: true });

    	const block = {
    		c: function create() {
    			cart.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(cart, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(cart.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(cart.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(cart, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$6.name, type: "if", source: "(24:2) {#if $globalStore.cart}", ctx });
    	return block;
    }

    // (18:0) <Router>
    function create_default_slot$1(ctx) {
    	var t0, t1, t2, t3, t4, t5, t6, current;

    	var navbar = new Navbar({ $$inline: true });

    	var if_block0 = (ctx.$globalStore.sidebar) && create_if_block_1$1(ctx);

    	var if_block1 = (ctx.$globalStore.cart) && create_if_block$6(ctx);

    	var route0 = new Route({
    		props: { path: "/", component: Home },
    		$$inline: true
    	});

    	var route1 = new Route({
    		props: { path: "/about", component: About },
    		$$inline: true
    	});

    	var route2 = new Route({
    		props: { path: "/login", component: Login },
    		$$inline: true
    	});

    	var route3 = new Route({
    		props: {
    		path: "/products",
    		component: Products_1
    	},
    		$$inline: true
    	});

    	var route4 = new Route({
    		props: {
    		path: "/products/:id",
    		component: ProductTemplate
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			navbar.$$.fragment.c();
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();
    			route0.$$.fragment.c();
    			t3 = space();
    			route1.$$.fragment.c();
    			t4 = space();
    			route2.$$.fragment.c();
    			t5 = space();
    			route3.$$.fragment.c();
    			t6 = space();
    			route4.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(navbar, target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(route0, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(route1, target, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(route2, target, anchor);
    			insert_dev(target, t5, anchor);
    			mount_component(route3, target, anchor);
    			insert_dev(target, t6, anchor);
    			mount_component(route4, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.$globalStore.sidebar) {
    				if (!if_block0) {
    					if_block0 = create_if_block_1$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t1.parentNode, t1);
    				} else transition_in(if_block0, 1);
    			} else if (if_block0) {
    				group_outros();
    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});
    				check_outros();
    			}

    			if (ctx.$globalStore.cart) {
    				if (!if_block1) {
    					if_block1 = create_if_block$6(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t2.parentNode, t2);
    				} else transition_in(if_block1, 1);
    			} else if (if_block1) {
    				group_outros();
    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);

    			transition_in(if_block0);
    			transition_in(if_block1);

    			transition_in(route0.$$.fragment, local);

    			transition_in(route1.$$.fragment, local);

    			transition_in(route2.$$.fragment, local);

    			transition_in(route3.$$.fragment, local);

    			transition_in(route4.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			transition_out(route3.$$.fragment, local);
    			transition_out(route4.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(navbar, detaching);

    			if (detaching) {
    				detach_dev(t0);
    			}

    			if (if_block0) if_block0.d(detaching);

    			if (detaching) {
    				detach_dev(t1);
    			}

    			if (if_block1) if_block1.d(detaching);

    			if (detaching) {
    				detach_dev(t2);
    			}

    			destroy_component(route0, detaching);

    			if (detaching) {
    				detach_dev(t3);
    			}

    			destroy_component(route1, detaching);

    			if (detaching) {
    				detach_dev(t4);
    			}

    			destroy_component(route2, detaching);

    			if (detaching) {
    				detach_dev(t5);
    			}

    			destroy_component(route3, detaching);

    			if (detaching) {
    				detach_dev(t6);
    			}

    			destroy_component(route4, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$1.name, type: "slot", source: "(18:0) <Router>", ctx });
    	return block;
    }

    function create_fragment$l(ctx) {
    	var current;

    	var router = new Router({
    		props: {
    		$$slots: { default: [create_default_slot$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			router.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var router_changes = {};
    			if (changed.$$scope || changed.$globalStore) router_changes.$$scope = { changed, ctx };
    			router.$set(router_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$l.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let $globalStore;

    	validate_store(store, 'globalStore');
    	component_subscribe($$self, store, $$value => { $globalStore = $$value; $$invalidate('$globalStore', $globalStore); });

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('$globalStore' in $$props) store.set($globalStore);
    	};

    	return { $globalStore };
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$l, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$l.name });
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
