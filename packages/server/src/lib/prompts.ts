export function blocks(...parts: readonly string[]): string {
	return parts
		.map((part) => part.trim())
		.filter(Boolean)
		.join('\n\n');
}
