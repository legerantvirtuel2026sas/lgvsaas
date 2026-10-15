import { MaintenanceScreen } from '@/components/layout/maintenance-screen';

export default function ConsolidationModulePage({ params }: { params: { slug: string } }) {
  return (
    <MaintenanceScreen
      companySlug={params.slug}
      moduleName="Consolidation des 3 activités de l’entreprise"
      modulePack="MULTI_PACK"
    />
  );
}
