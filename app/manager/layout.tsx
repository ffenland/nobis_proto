import ManagerTabbar from '../components/manager/manager_tabbar'

const TabLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="mx-auto flex h-full w-full flex-col">
      <div className="flex-1 overflow-auto">{children}</div>
      <ManagerTabbar />
    </div>
  )
}

export default TabLayout
