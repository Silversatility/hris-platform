import Spinner from './Spinner'

function FullScreenLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f4efe2]/80 backdrop-blur-sm">
      <Spinner className="h-10 w-10 text-[#1c2f4d]" />
    </div>
  )
}

export default FullScreenLoader
