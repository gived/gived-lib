type KVS<T> = {
    [key: string]: T
};

export function h(str: string, props: KVS<any> = {}, children: (HTMLElement | string)[] = []) {
    const elName = str.split('.')[0];
    const className = str.split('.').slice(1).join(' ') + (props.className || '')
    const el = document.createElement(elName);
    for (const [attr, val] of Object.entries(props.attrs || {})) {
        el.setAttribute(attr, val as string);
    }
    Object.assign(el, props)
    el.className = className;

    el.append(...children)
    return el
}
