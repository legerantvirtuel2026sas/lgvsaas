import { MaintenanceScreen } from '@/components/layout/maintenance-screen';

export default function FleetModulePage({ params }: { params: { slug: string } }) {
  return (
    <MaintenanceScreen
      companySlug={params.slug}
      moduleName="Gestion de flotte et location"
      modulePack="FLEET"
    />
  );
}
