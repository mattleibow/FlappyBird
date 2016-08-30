using System;
using System.Collections.Generic;
using System.Globalization;
using System.Threading.Tasks;
using SkiaSharp;

namespace FlappyBird
{
    public class SpriteSheet
    {
        private readonly string sheetPath;
        private readonly string dataPath;

        public SpriteSheet(string sheetPath, string dataPath)
        {
            this.sheetPath = sheetPath;
            this.dataPath = dataPath;
        }

        public SKBitmap Bitmap { get; private set; }

        public Dictionary<string, Sprite> Sprites { get; private set; } = new Dictionary<string, Sprite>();

        public async Task LoadAsync()
        {
            if (Bitmap != null)
            {
                return;
            }

            Bitmap = await MediaLoader.LoadBitmapAsync(sheetPath);
            var info = Bitmap?.Info ?? SKImageInfo.Empty;
            if (Bitmap == null || info.Width == 0 || info.Height == 0)
            {
                throw new ArgumentException($"Unable to load sprite sheet bitmap '{sheetPath}'.");
            }

            var lines = await MediaLoader.LoadLinesAsync(dataPath, false);
            if (lines == null || lines.Length == 0)
            {
                throw new ArgumentException($"Unable to load sprite sheet data '{dataPath}'.");
            }

            foreach (var line in lines)
            {
                var chunks = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                if (chunks == null || chunks.Length != (int)SpriteSheetDataIndices.Count)
                {
                    throw new ArgumentException($"Invalid sprite sheet data '{dataPath}'.");
                }

                var name = chunks[(int)SpriteSheetDataIndices.Name];
                if (string.IsNullOrWhiteSpace(name))
                {
                    throw new ArgumentException($"Invalid sprite sheet data name '{line}'.");
                }

                int width;
                int height;
                float x;
                float y;
                float w;
                float h;
                if (!int.TryParse(chunks[(int)SpriteSheetDataIndices.Width], NumberStyles.Integer, CultureInfo.InvariantCulture, out width) ||
                    !int.TryParse(chunks[(int)SpriteSheetDataIndices.Height], NumberStyles.Integer, CultureInfo.InvariantCulture, out height) ||
                    !float.TryParse(chunks[(int)SpriteSheetDataIndices.X], NumberStyles.Float, CultureInfo.InvariantCulture, out x) ||
                    !float.TryParse(chunks[(int)SpriteSheetDataIndices.Y], NumberStyles.Float, CultureInfo.InvariantCulture, out y) ||
                    !float.TryParse(chunks[(int)SpriteSheetDataIndices.W], NumberStyles.Float, CultureInfo.InvariantCulture, out w) ||
                    !float.TryParse(chunks[(int)SpriteSheetDataIndices.H], NumberStyles.Float, CultureInfo.InvariantCulture, out h))
                {
                    throw new ArgumentException($"Invalid sprite sheet data item '{name}': '{line}'");
                }

                var size = new SKSize(width, height);
                var bounds = SKRect.Create(
                    (int)Math.Round(x * info.Width),
                    (int)Math.Round(y * info.Height),
                    (int)Math.Round(w * info.Width),
                    (int)Math.Round(h * info.Height));

                var sprite = new Sprite(this, name, size, bounds);
                Sprites.Add(name, sprite);
            }
        }

        private enum SpriteSheetDataIndices
        {
            Name = 0,

            Width = 1,
            Height = 2,

            X = 3,
            Y = 4,
            W = 5,
            H = 6,

            Count = 7
        }
    }
}
