import type {Accessor, createSignal, onMount, Show} from 'solid-js'
import type {ChatMessage} from '../types'
import MarkdownIt from 'markdown-it'
// @ts-ignore
import mdKatex from 'markdown-it-katex'
import mdHighlight from 'markdown-it-highlightjs'
import Clipboard from "./Clipboard"
import {preWrapperPlugin} from "../markdown"
import "../styles/message.css"
import {useCopyCode} from "../hooks"
import IconClear from "./icons/Clear";

interface Props {
    role: ChatMessage['role']
    message: Accessor<string> | string
    onDeleteClick: () => void
    onGratuityClick: (event) => void
}

export default ({role, message, onDeleteClick, onGratuityClick}: Props) => {
    useCopyCode()
    const roleClass = {
        system: 'bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300',
        user: 'bg-gradient-to-r from-purple-400 to-yellow-400',
        assistant: 'bg-gradient-to-r from-yellow-200 via-green-200 to-green-300',
        tips: 'bg-gradient-to-r from-blue-200 via-red-200 to-yellow-300',
    }
    const htmlString = () => {
        const md = MarkdownIt({
            linkify: true
        })
            .use(mdKatex)
            .use(mdHighlight, {
                inline: true
            })
            .use(preWrapperPlugin)

        if (typeof message === 'function') {
            return md.render(message().trim())
        } else if (typeof message === 'string') {
            return md.render(message.trim())
        }
        return ''
    }

    const handleGratuityClick = (event) => {
        console.log("handleGratuityClick")
        event.preventDefault()
        onGratuityClick(event)
        console.log("handleGratuityClick ", event.target.href)
        // setShowGratuity(true)
    }
    return (
        <div class="flex">
            <div
                class="flex py-0 gap-2 px-4 rounded-lg transition-colors md:hover:bg-slate/5 dark:md:hover:bg-slate/2 relative message-item"
                // class:op-75={role === "user"}
            >
                <div
                    class={`shrink-0 w-5 h-5 mt-0.5rem rounded-full op-80 ${roleClass[role]}`}
                ></div>
                <div
                    class="message py-0 pr-5 text-sm prose prose-slate dark:prose-invert dark:text-slate break-words overflow-hidden"
                    innerHTML={htmlString()}
                    onClick={(event) => {
                        if(event.target.tagName === 'A') {
                            handleGratuityClick(event)
                        }
                    }}
                />
                <Clipboard
                    message={(() => {
                        if (typeof message === "function") {
                            return message().trim()
                        } else if (typeof message === "string") {
                            return message.trim()
                        }
                        return ""
                    })()}
                />
            </div>
            <Show when={role!=='tips'}>
                {/*<button title='Delete' onClick={() => onDeleteClick()} px-4 py-2 bg-op-5 hover:bg-op-20 text-slate*/}
                {/*        rounded-sm>*/}
                {/*    <IconClear/>*/}
                {/*</button>*/}
                <div class='flex items-center'>
                    <button
                        class="i-carbon:trash-can px-4 py-2 bg-op-5 text-op-20! hover:text-op-80! text-slate-7 dark:text-slate"
                        onClick={() => onDeleteClick()}
                    />
                </div>
            </Show>
        </div>
    )
}