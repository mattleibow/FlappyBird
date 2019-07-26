using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using SkiaSharp;

namespace FlappyBird.GameEngine
{
	public class MediaLoader
	{
		private readonly Dictionary<Assembly, string[]> resources = new Dictionary<Assembly, string[]>();

		public void RegisterMediaAssembly<T>()
		{
			var type = typeof(T);
			RegisterMediaAssembly(type.GetTypeInfo().Assembly);
		}

		public void RegisterMediaAssembly(Assembly assembly)
		{
			resources[assembly] = assembly.GetManifestResourceNames();
		}

		public Stream LoadStream(string path)
		{
			foreach (var pair in resources)
			{
				// first try exact, then replace slashes
				var name = pair.Value.FirstOrDefault(r =>
					r.EndsWith(path, StringComparison.OrdinalIgnoreCase) ||
					r.EndsWith(path.Replace('/', '.').Replace('\\', '.'), StringComparison.OrdinalIgnoreCase));

				if (name != null)
					return pair.Key.GetManifestResourceStream(name);
			}

			throw new ArgumentException($"Unable to find resource for '{path}'.", nameof(path));
		}

		public Task<SKImage> LoadTextureAsync(string path)
		{
			return Task.Run(() =>
			{
				using (var stream = LoadStream(path))
				{
					return SKImage.FromEncodedData(stream);
				}
			});
		}

		public Task<string> LoadStringAsync(string path)
		{
			return Task.Run(async () =>
			{
				using (var stream = LoadStream(path))
				using (var reader = new StreamReader(stream))
				{
					return await reader.ReadToEndAsync().ConfigureAwait(false);
				}
			});
		}

		public Task<string[]> LoadLinesAsync(string path, bool keepEmptyLines = true)
		{
			return Task.Run(async () =>
			{
				using (var stream = LoadStream(path))
				using (var reader = new StreamReader(stream))
				{
					var lines = await reader.ReadToEndAsync().ConfigureAwait(false);
					var keepEmpty = keepEmptyLines ? StringSplitOptions.None : StringSplitOptions.RemoveEmptyEntries;
					return lines.Split(new[] { "\r\n", "\n" }, keepEmpty);
				}
			});
		}
	}
}
