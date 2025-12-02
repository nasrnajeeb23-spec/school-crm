import React from 'react';

type State = { hasError: boolean; error?: any };

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: any): State { return { hasError: true, error }; }
  componentDidCatch(error: any, info: any) {}
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md max-w-md w-full text-center">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">حدث خطأ غير متوقع</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">يرجى تحديث الصفحة أو العودة لاحقًا.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => { try { location.reload(); } catch {} }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">تحديث</button>
              <button onClick={() => this.setState({ hasError: false, error: undefined })} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200">رجوع</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}
