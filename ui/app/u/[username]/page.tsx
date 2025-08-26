type Props = { params: { username: string } };

export default async function UserPage({ params }: Props) {
  const { username } = params;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">@{username}</h1>
      <p>User profile coming soon.</p>
    </div>
  );
}
