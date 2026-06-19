import { useState } from 'react';

export default function useConfirm() {
  const [state, setState] = useState({ show: false, title: '', message: '', resolve: null });

  const confirm = (title, message) => {
    return new Promise(resolve => {
      setState({ show: true, title, message, resolve });
    });
  };

  const handleConfirm = () => {
    state.resolve(true);
    setState(s => ({ ...s, show: false }));
  };

  const handleCancel = () => {
    state.resolve(false);
    setState(s => ({ ...s, show: false }));
  };

  const ConfirmModal = () => {
    if (!state.show) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
          <div className="p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">{state.title}</h3>
            <p className="text-gray-500 mb-6">{state.message}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={handleCancel} className="btn-secondary px-6">Cancel</button>
              <button onClick={handleConfirm} className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 font-medium">Delete</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return { confirm, ConfirmModal };
}