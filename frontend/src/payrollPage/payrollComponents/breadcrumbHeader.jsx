import Breadcrumbs from "../../components/breadcrumbs/Breadcrumbs";

export default function BreadcrumbHeader({ title, items }) {
  return (
    <div className="sticky flex flex-col w-full pb-3 pl-5 border-b-2 gap-y-2 Glc-dashboard-bg-header">
      <span className="text-2xl font-semibold">{title}</span>
      <Breadcrumbs items={items} />
    </div>
  );
}