using SkiaSharp;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Threading.Tasks;

namespace FlappyBird.GameEngine
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

		public SKImage? Atlas { get; private set; }

		public Dictionary<string, Sprite> Sprites { get; } = new Dictionary<string, Sprite>();

		public async Task LoadAsync(MediaLoader mediaLoader)
		{
			if (Atlas != null)
				return;

			Atlas = await mediaLoader.LoadTextureAsync(sheetPath);
			if (Atlas == null || Atlas.Width == 0 || Atlas.Height == 0)
				throw new ArgumentException($"Unable to load sprite sheet bitmap '{sheetPath}'.");

			var lines = await mediaLoader.LoadLinesAsync(dataPath, false);
			if (lines == null || lines.Length == 0)
				throw new ArgumentException($"Unable to load sprite sheet data '{dataPath}'.");

			foreach (var line in lines)
			{
				var chunks = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
				if (chunks == null || chunks.Length != (int)DataIndices.Count)
					throw new ArgumentException($"Invalid sprite sheet data '{dataPath}'.");

				var name = chunks[(int)DataIndices.Name];
				if (string.IsNullOrWhiteSpace(name))
					throw new ArgumentException($"Invalid sprite sheet data name '{line}'.");

				if (!int.TryParse(chunks[(int)DataIndices.Width], NumberStyles.Integer, CultureInfo.InvariantCulture, out int width) ||
					!int.TryParse(chunks[(int)DataIndices.Height], NumberStyles.Integer, CultureInfo.InvariantCulture, out int height) ||
					!float.TryParse(chunks[(int)DataIndices.X], NumberStyles.Float, CultureInfo.InvariantCulture, out float x) ||
					!float.TryParse(chunks[(int)DataIndices.Y], NumberStyles.Float, CultureInfo.InvariantCulture, out float y) ||
					!float.TryParse(chunks[(int)DataIndices.W], NumberStyles.Float, CultureInfo.InvariantCulture, out float w) ||
					!float.TryParse(chunks[(int)DataIndices.H], NumberStyles.Float, CultureInfo.InvariantCulture, out float h))
				{
					throw new ArgumentException($"Invalid sprite sheet data item '{name}': '{line}'");
				}

				var size = new SKSize(width, height);
				var bounds = SKRect.Create(
					(int)Math.Round(x * Atlas.Width),
					(int)Math.Round(y * Atlas.Height),
					(int)Math.Round(w * Atlas.Width),
					(int)Math.Round(h * Atlas.Height));

				var sprite = new Sprite(this, name, size, bounds);
				Sprites.Add(name, sprite);
			}
		}

		private enum DataIndices
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
