import { redirect } from 'next/navigation';

export default function CommerceActivityPage({
  params,
}: {
  params: { slug: string };
}) {
  redirect(`/e/${params.slug}/commerce/tableau-de-bord`);
}
