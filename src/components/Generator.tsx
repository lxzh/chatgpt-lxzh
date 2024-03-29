import {createEffect, createSignal, For, onMount, Show} from 'solid-js'
import {createResizeObserver} from "@solid-primitives/resize-observer"
import MessageItem from './MessageItem'
import IconClear from './icons/Clear'
import type {ChatMessage} from '../types'
import SettingAction from "./SettingAction"
import IconSetting from "./icons/Setting"
import Dialog from "./Dialog"

import PromptList from "./PromptList"
import type {PromptItem} from "./PromptItem"

import {Fzf} from "fzf"
import {defaultMessage, defaultSetting} from "../default"
import throttle from "just-throttle"
import {isMobile} from "../utils"

export type Setting = typeof defaultSetting

export default (props: { prompts: PromptItem[] }) => {
    let inputRef: HTMLTextAreaElement
    let containerRef: HTMLDivElement
    const [messageList, setMessageList] = createSignal<ChatMessage[]>([])
    const [inputContent, setInputContent] = createSignal("")
    const [currentAssistantMessage, setCurrentAssistantMessage] = createSignal('')
    const [loading, setLoading] = createSignal(false)
    const [controller, setController] = createSignal<AbortController>()
    const [setting, setSetting] = createSignal(defaultSetting)
    const [compatiblePrompt, setCompatiblePrompt] = createSignal<PromptItem[]>([])
    const [gratuity, setShowGratuity] = createSignal(false)
    const [containerWidth, setContainerWidth] = createSignal("init")
    const fzf = new Fzf(props.prompts, {
        selector: k => `${k.desc} (${k.prompt})`
    })
    const [height, setHeight] = createSignal("48px")
    const [gratuityUrl] = createSignal("https://lxzh.oss-cn-hangzhou.aliyuncs.com/pay.png")

    onMount(() => {
        document.querySelector("main")?.classList.remove("before")
        document.querySelector("main")?.classList.add("after")
        createResizeObserver(containerRef, ({width, height}, el) => {
            if (el === containerRef) setContainerWidth(`${width}px`)
        })
        const storage = localStorage.getItem("setting")
        const session = localStorage.getItem("session")
        try {
            let archiveSession = false
            if (storage) {
                const parsed = JSON.parse(storage)
                archiveSession = parsed.archiveSession
                setSetting({
                    ...defaultSetting,
                    ...parsed
                    // continuousDialogue: false
                })
            }
            if (session && archiveSession) {
                setMessageList(JSON.parse(session))
            }
        } catch {
            console.log("Setting parse error")
        }
    })

    createEffect(() => {
        if (messageList().length === 0) {
            setMessageList([
                {
                    role: "tips",
                    content: defaultMessage
                }
            ])
            // setMessageList([
            //   ...messageList(),
            //   {
            //     role: 'user',
            //     content: '你好呀',
            //   },
            //   {
            //     role: 'assistant',
            //     content: '你好，请问有什么需要帮忙的吗，请问有什么需要帮忙的吗，请问有什么需要帮忙的吗，请问有什么需要帮忙的吗，请问有什么需要帮忙的吗，请问有什么需要帮忙的吗，',
            //   },
            //   {
            //     role: 'user',
            //     content: '你好呀',
            //   },
            // ])
        } else if (
            messageList().length > 1 &&
            messageList()[0].content === defaultMessage
        ) {
            setMessageList(messageList().slice(1))
        }
        localStorage.setItem("setting", JSON.stringify(setting()))
        if (setting().archiveSession)
            localStorage.setItem("session", JSON.stringify(messageList()))
    })

    createEffect(() => {
        messageList()
        currentAssistantMessage()
        scrollToBottom()
    })

    createEffect(() => {
        if (inputContent() === "") {
            setHeight("48px")
            setCompatiblePrompt([])
        }
    })

    const scrollToBottom = throttle(
        () => {
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: "smooth"
            })
        },
        250,
        {leading: true, trailing: false}
    )

    function archiveCurrentMessage() {
        if (currentAssistantMessage()) {
            setMessageList([
                ...messageList(),
                {
                    role: "assistant",
                    content: currentAssistantMessage()
                }
            ])
            setCurrentAssistantMessage("")
            setLoading(false)
            setController()
            !isMobile() && inputRef.focus()
            scrollToBottom.flush()
        }
    }

    const handleGratuityClick = (event) => {
        console.log("handleGratuityClick")
        if (event.target.href.includes('null')) {
            setShowGratuity(true)
        } else {
            window.open(event.target.href, "_blank")
        }
    }

    const handleCloseGratuity = () => {
        console.log("handleCloseGratuity")
        setShowGratuity(false)
    }

    const handleButtonClick = async (value?: string) => {
        const inputValue = value ?? inputContent()
        if (!inputValue) {
            return
        }
        setLoading(true)
        // @ts-ignore
        // if (window?.umami) umami.trackEvent('chat_generate')
        setInputContent("")
        if (
            !value ||
            value !==
            messageList()
                .filter(k => k.role === "user")
                .at(-1)?.content
        ) {
            setMessageList([
                ...messageList(),
                {
                    role: "user",
                    content: inputValue
                }
            ])
        }

        try {
            await fetchGPT(inputValue)
        } catch (error) {
            setLoading(false)
            setController()
            setCurrentAssistantMessage(
                String(error).includes("The user aborted a request")
                    ? ""
                    : String(error)
            )
        }
        archiveCurrentMessage()
    }

    const fetchGPT = async (inputValue: string) => {
        setLoading(true)
        const controller = new AbortController()
        setController(controller)
        const systemRule = setting().systemRule.trim()
        const message = {
            role: "user",
            content: systemRule ? systemRule + "\n" + inputValue : inputValue
        }
        const response = await fetch("/api/stream", {
            method: "POST",
            body: JSON.stringify({
                messages: setting().continuousDialogue
                    ? [...messageList().slice(0, -1), message]
                    : [message],
                key: setting().openaiAPIKey,
                temperature: setting().openaiAPITemperature / 100
            }),
            signal: controller.signal
        })
        if (!response.ok) {
            throw new Error(response.statusText)
        }
        const data = response.body
        if (!data) {
            throw new Error("没有返回数据")
        }
        const reader = data.getReader()
        const decoder = new TextDecoder("utf-8")
        let done = false

        while (!done) {
            const {value, done: readerDone} = await reader.read()
            if (value) {
                let char = decoder.decode(value)
                if (char === "\n" && currentAssistantMessage().endsWith("\n")) {
                    continue
                }
                if (char) {
                    setCurrentAssistantMessage(currentAssistantMessage() + char)
                }
            }
            done = readerDone
        }
    }

    function showPromote() {
        setCompatiblePrompt(props.prompts)
    }

    function clearSession() {
        // setInputContent("")
        setMessageList([])
        setCurrentAssistantMessage("")
    }

    function stopStreamFetch() {
        if (controller()) {
            controller()?.abort()
            archiveCurrentMessage()
        }
    }

    function reAnswer() {
        handleButtonClick(
            messageList()
                .filter(k => k.role === "user")
                .at(-1)?.content
        )
    }

    function selectPrompt(prompt: string) {
        setInputContent(prompt)
        setCompatiblePrompt([])
        const {scrollHeight} = inputRef
        setHeight(
            `${
                scrollHeight > window.innerHeight - 64
                    ? window.innerHeight - 64
                    : scrollHeight
            }px`
        )
        inputRef.focus()
    }

    const deleteMessage = (index) => {
        console.log(`delete item:${index}`)
        setMessageList(messageList().filter((_, i) => i !== index))
        console.log(messageList())
    }

    return (
        <div ref={containerRef!}>
            <Show when={gratuity()}>
                <div style="position: relative">
                    <div style="position: absolute; top: 20px; right: 20px;z-index:1;">
                        <img src={gratuityUrl()}/>
                    </div>
                    <div style="position: absolute; top: 20px; right: 22px;z-index:2;">
                        <button
                            class="i-carbon:add-filled rotate-45 text-op-20! hover:text-op-80! text-slate-7 dark:text-slate"
                            onClick={() => handleCloseGratuity()}
                        />
                    </div>
                </div>
            </Show>
            <Show when={!gratuity()}>
                <div mt-4>
                    <div
                        id="message-container"
                        style={{
                            "background-color": "var(--c-bg)"
                        }}
                    >
                        <For each={messageList()}>
                            {(message, index) =>
                                <MessageItem role={message.role} message={message.content} onDeleteClick={() => {
                                    deleteMessage(index())
                                }} onGratuityClick={(event) => {
                                    return handleGratuityClick(event)
                                }}/>
                            }
                        </For>
                        {currentAssistantMessage() &&
                            <MessageItem role="assistant" message={currentAssistantMessage} onDeleteClick={undefined}
                                         onGratuityClick={undefined}/>
                        }
                    </div>
                    <div
                        class="pb-0.5em fixed bottom-0 z-100 op-0"
                        style={
                            containerWidth() === "init"
                                ? {}
                                : {
                                    transition: "opacity 1s ease-in-out",
                                    width: containerWidth(),
                                    opacity: 100,
                                    "background-color": "var(--c-bg)"
                                }
                        }
                    >
                        <Show when={!compatiblePrompt().length && height() === "48px"}>
                            <SettingAction
                                setting={setting}
                                setSetting={setSetting}
                                showPromote={showPromote}
                                clear={clearSession}
                                reAnswer={reAnswer}
                                messaages={messageList()}
                            />
                        </Show>
                        <Show
                            when={!loading()}
                            fallback={() =>
                                <div
                                    class="h-12 my-4 flex items-center justify-center bg-slate bg-op-15 text-slate rounded-sm">
                                    <span>AI is thinking...</span>
                                    <div
                                        class="ml-1em px-2 py-0.5 border border-slate text-slate rounded-md text-sm op-70 cursor-pointer hover:bg-slate/10"
                                        onClick={stopStreamFetch}
                                    >
                                        不需要了
                                    </div>
                                </div>
                            }>
                            <Show when={compatiblePrompt().length}>
                                <PromptList
                                    prompts={compatiblePrompt()}
                                    select={selectPrompt}
                                ></PromptList>
                            </Show>
                            <div class="my-2 flex items-end">
          <textarea
              ref={inputRef!}
              id="input"
              placeholder="Enter something..."
              autoComplete='off'
              value={inputContent()}
              autoFocus
              onClick={scrollToBottom}
              disabled={loading()}
              onKeyDown={(e) => {
                  if (compatiblePrompt().length) {
                      if (
                          e.key === "ArrowUp" ||
                          e.key === "ArrowDown" ||
                          e.key === "Enter"
                      ) {
                          e.preventDefault()
                      }
                  } else if (e.key === "Enter") {
                      if (!e.shiftKey && !e.isComposing) {
                          handleButtonClick()
                      }
                  }
              }}
              onInput={e => {
                  setHeight("48px")
                  const {scrollHeight} = e.currentTarget
                  setHeight(
                      `${
                          scrollHeight > window.innerHeight - 64
                              ? window.innerHeight - 64
                              : scrollHeight
                      }px`
                  )
                  let {value} = e.currentTarget
                  setInputContent(value)
                  if (value === "/" || value === " ")
                      return setCompatiblePrompt(props.prompts)
                  const promptKey = value.replace(/^[\/ ](.*)/, "$1")
                  if (promptKey !== value)
                      setCompatiblePrompt(fzf.find(promptKey).map(k => k.item))
              }}
              style={{
                  height: height(),
                  "border-bottom-right-radius": 0,
                  "border-top-right-radius": height() === "48px" ? 0 : "0.25rem",
                  "border-top-left-radius":
                      compatiblePrompt().length === 0 ? "0.25rem" : 0
              }}
              class="self-end py-3 resize-none w-full px-3 text-slate-7 dark:text-slate bg-slate bg-op-15 focus:bg-op-20 focus:ring-0 focus:outline-none placeholder:text-slate-400 placeholder:text-slate-400 placeholder:op-40"
              rounded-l
          />
                                <Show when={inputContent()}>
                                    <button
                                        class="i-carbon:add-filled absolute right-3.5em bottom-2em rotate-45 text-op-20! hover:text-op-80! text-slate-7 dark:text-slate"
                                        onClick={() => {
                                            setInputContent("")
                                            inputRef.focus()
                                        }}
                                    />
                                </Show>
                                <div
                                    class="flex text-slate-7 dark:text-slate bg-slate bg-op-15 text-op-80! hover:text-op-100! h-3em items-center rounded-r"
                                    style={{
                                        "border-top-right-radius":
                                            compatiblePrompt().length === 0 ? "0.25rem" : 0
                                    }}
                                >
                                    <button
                                        title="Send"
                                        onClick={() => handleButtonClick()}
                                        class="i-carbon:send-filled text-5 mx-3"
                                    />
                                </div>
                            </div>
                        </Show>
                    </div>
                </div>
            </Show>
        </div>
    )
}
