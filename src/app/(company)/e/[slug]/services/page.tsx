import { MaintenanceScreen } from '@/components/layout/maintenance-screen';

export default function ServicesModulePage({ params }: { params: { slug: string } }) {
  return (
    <MaintenanceScreen
      companySlug={params.slug}
      moduleName="Gestion des prestations et services"
      modulePack="SERVICES"
    />
  );
}
