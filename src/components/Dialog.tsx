import {createSignal} from 'solid-js';
import IconClear from './icons/Clear'

const Dialog = ({title, onSave, onClose}) => {
    const [value, setValue] = createSignal('');
    const [error, setError] = createSignal('');

    const handleSubmit = () => {
        if (value().trim() === '') {
            setError('Value cannot be empty');
            return;
        }
        try {
            onSave(value());
            setValue('');
            setError('');
            onClose();
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <div class='fixed inset-0 z-50 flex justify-center items-center bg-slate-500 bg-opacity-70'>
            <div class='bg-slate-500 rounded-lg shadow-lg w-96'>
                <div class='flex bg-slate-500 rounded-t-lg p-4 justify-between'>
                    <h2 class='text-lg text-slate font-medium'>{title}</h2>
                    <button title='Close' onClick={() => onClose()} h-5 hover:bg-op-20
                            text-slate rounded-sm>
                        <IconClear/>
                    </button>
                </div>
                <div class='p-4'>
                    <input
                        type="text"
                        class={`w-full bg-slate-500 border-slate-500 rounded-md p-2 ${error() ? "border-red-500" : "focus:border-state-500 focus:ring focus:ring-state-200"}`}
                        value={value()}
                        onInput={(e) => setValue(e.target.value)}
                    />
                    <div class='text-red-500 test-sm h-2 mt-2'>{error()}</div>
                </div>
                <div class='flex justify-end p-4'>
                    <button class='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
                            onClick={handleSubmit}>Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dialog;