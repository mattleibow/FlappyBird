using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using SkiaSharp;

namespace FlappyBird
{
    public static class MediaLoader
    {
        private static readonly Assembly assembly;
        private static readonly string[] resources;

        static MediaLoader()
        {
            var type = typeof(MediaLoader);
            assembly = type.GetTypeInfo().Assembly;
            resources = assembly.GetManifestResourceNames();
        }

        public static Stream LoadStream(string path)
        {
            var name = GetResourceName(path);
            if (name == null)
            {
                throw new ArgumentException($"Unable to find resource for '{path}'.", nameof(path));
            }

            return assembly.GetManifestResourceStream(name);
        }

        public static Task<SKBitmap> LoadBitmapAsync(string path)
        {
            return Task.Run(() =>
            {
                using (var stream = LoadStream(path))
                using (var managed = new SKManagedStream(stream))
                {
                    return SKBitmap.Decode(managed);
                }
            });
        }

        public static Task<string> LoadStringAsync(string path)
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

        public static Task<string[]> LoadLinesAsync(string path, bool keepEmptyLines = true)
        {
            return Task.Run(async () =>
            {
                using (var stream = LoadStream(path))
                using (var reader = new StreamReader(stream))
                {
                    var lines = await reader.ReadToEndAsync().ConfigureAwait(false);
                    return lines.Split(new[] { "\r\n", "\n" }, keepEmptyLines ? StringSplitOptions.None : StringSplitOptions.RemoveEmptyEntries);
                }
            });
        }

        private static string GetResourceName(string path)
        {
            // first try exact, then replace slashes
            return resources.FirstOrDefault(r =>
                r.EndsWith(path, StringComparison.OrdinalIgnoreCase) ||
                r.EndsWith(path.Replace('/', '.').Replace('\\', '.'), StringComparison.OrdinalIgnoreCase));
        }
    }
}
