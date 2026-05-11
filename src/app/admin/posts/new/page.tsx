import { getFrequentTags } from "@/lib/frequent-tags";
import NewPostForm from "./new-form";

export default async function NewPostPage() {
  const frequentTags = await getFrequentTags();
  return <NewPostForm frequentTags={frequentTags} />;
}
