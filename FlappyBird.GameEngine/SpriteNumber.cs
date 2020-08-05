using SkiaSharp;
using System;
using System.Collections.Generic;
using System.Linq;

namespace FlappyBird.GameEngine
{
	public class SpriteNumber
	{
		private const float DigitSpace = 2f;

		private readonly Sprite[] allDigits;

		private int numberValue;

		public SpriteNumber(Dictionary<string, Sprite> sprites, Func<int, string> numberFormatter)
			: this(Enumerable.Range(0, 10).Select(i => sprites[numberFormatter(i)]))
		{
		}

		public SpriteNumber(IEnumerable<Sprite> digits)
		{
			allDigits = digits.ToArray();

			DigitWidth = allDigits.Max(d => d.Size.Width);
			DigitHeight = allDigits.Max(d => d.Size.Height);
			Value = 0;
			Visible = true;
			DigitSprites = new Sprite[0];
		}

		public int Value
		{
			get => numberValue;
			set
			{
				numberValue = Math.Max(0, value);

				var text = numberValue.ToString("0");
				var sprites = new Sprite[text.Length];
				for (int i = 0; i < sprites.Length; i++)
				{
					var number = int.Parse(text[i].ToString());
					sprites[i] = allDigits[number];
				}
				DigitSprites = sprites;
			}
		}

		public bool Visible { get; set; }

		public float DigitWidth { get; }

		public float DigitHeight { get; }

		public float Width => DigitSprites.Length * (DigitWidth + DigitSpace);

		public float Height => DigitHeight;

		public Sprite[] DigitSprites { get; private set; }

		public void Draw(SKCanvas canvas, float x, float y)
		{
			if (!Visible)
				return;

			var offset = 0f;
			foreach (var sprite in DigitSprites)
			{
				var left = x + offset + (DigitWidth - sprite.Size.Width);
				var top = y + (DigitHeight - sprite.Size.Height);
				sprite.Draw(canvas, left, top);
				offset += DigitWidth + DigitSpace;
			}
		}
	}
}
