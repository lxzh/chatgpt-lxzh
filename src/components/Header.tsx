import { createSignal, For, Show } from 'solid-js'
import IconSetting from './icons/Setting'
import Logo from './icons/Logo'

export default () => {
    let inputRef: HTMLInputElement
    const [currentAssistantMessage, setCurrentAssistantMessage] = createSignal('')
    const [loading, setLoading] = createSignal(false)
    const [apiKey, setApiKey] = createSignal('')
    const [showInput, setShowInput] = createSignal(false)

    const handleSettingClick = () => {
        handleOpenInput()
    }

    const handleOpenInput = () => {
        setShowInput(true)
    }

    const handleCloseInput = () => {
        setShowInput(true)
    }

    const handleSaveClick = async () => {
        console.log("handleSaveClick")
        if(!apiKey()) {
            alert('Tip: Please enter a valid OpenAI API key')
            return
        }
        const expires = new Date();
        expires.setTime(expires.getTime() + (6 * 30 * 24 * 60 * 60 * 1000)); // 180天后过期
        document.cookie = `apiKey=${apiKey()}; expires=${expires.toUTCString()}; path=/`;
        handleCloseInput()
    }

    return (
        <header>
            <Logo/>
            <div class="flex items-center mt-2">
                <span class="text-2xl text-slate font-extrabold mr-1">ChatGPT</span>
                <span
                    class="text-2xl text-transparent font-extrabold bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-600">Demo</span>
            </div>
            <p mt-1 text-slate op-60>Based on OpenAI API (gpt-3.5-turbo).</p>
        </header>
    )
}
