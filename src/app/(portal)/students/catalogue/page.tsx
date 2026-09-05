import { Heading } from "@/components/ui";
import { Catalogue } from "@/components/catalogue";
import { catalogue } from "@/lib/data";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [courses, params] = await Promise.all([catalogue(), searchParams]);
  return (
    <>
      <Heading
        title="Find your next possibility."
        copy="Practical skills. New perspectives. Explore a course that takes you further."
      />
      <Catalogue courses={courses} query={params.q} />
    </>
  );
}
