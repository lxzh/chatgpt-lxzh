import { onCleanup, onMount } from "solid-js"
import { copyToClipboard } from "../utils"

export function useCopyCode() {
  // @ts-ignore
  const timeoutIdMap: Map<HTMLElement, NodeJS.Timeout> = new Map()
  const listerner = (e: MouseEvent) => {
    const el = e.target as HTMLElement
    if (el.matches(".code-copy")) {
      const parent = el.parentElement
      const sibling = el.nextElementSibling as HTMLPreElement | null
      if (!parent || !sibling) {
        return
      }

      let text = sibling.innerText

      copyToClipboard(text.trim()).then(() => {
        el.classList.add("copied")
        clearTimeout(timeoutIdMap.get(el))
        const timeoutId = setTimeout(() => {
          el.classList.remove("copied")
          el.blur()
          timeoutIdMap.delete(el)
        }, 2000)
        timeoutIdMap.set(el, timeoutId)
      })
    }
  }
  onMount(() => {
    window.addEventListener("click", listerner)
  })
  onCleanup(() => {
    window.removeEventListener("click", listerner)
  })
}
