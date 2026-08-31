export default function ProfileSkills({ skills }) {
  if (!skills?.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
      {skills.map((skill) => (
        <span
          key={skill}
          className="px-2 py-0.5 rounded-full text-xs font-medium border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          {skill}
        </span>
      ))}
    </div>
  );
}
