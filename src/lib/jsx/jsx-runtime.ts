type Child = Node | string | number | false | null | undefined | Child[]
type Props = { children?: Child; [name: string]: unknown }
type Component = (props: Props) => Node

function appendChildren(parent: Node, child: Child): void {
  if (Array.isArray(child)) {
    child.forEach((item) => appendChildren(parent, item))
  } else if (child !== null && child !== undefined && child !== false) {
    parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)))
  }
}

export function jsx(type: string | Component, props: Props): Node {
  if (typeof type === 'function') return type(props)

  const { children, ...attributes } = props
  const element = document.createElement(type)

  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined || value === null || value === false) continue
    if (name.startsWith('on') && typeof value === 'function') {
      element.addEventListener(name.slice(2).toLowerCase(), value as EventListener)
    } else {
      element.setAttribute(name, value === true ? '' : String(value))
    }
  }

  appendChildren(element, children)
  return element
}

export function Fragment({ children }: Props): Node {
  const fragment = document.createDocumentFragment()
  appendChildren(fragment, children)
  return fragment
}

export { jsx as jsxs, jsx as jsxDEV }

export namespace JSX {
  export type Element = Node
  export type ElementType = string | Component
  export interface ElementChildrenAttribute {
    children: object
  }
  export type IntrinsicElements = {
    [K in keyof HTMLElementTagNameMap]: Props
  }
}
