using System;
using System.Collections.Generic;
using System.Linq;
using SkiaSharp;

using FlappyBird.GameEngine;

namespace FlappyBird.Sprites
{
    public class AnimatedSpriteNumber
    {
        public const float CountSpeed = 0.5f;

        private readonly SpriteNumber sprite;
        private readonly Animator counter;

        public AnimatedSpriteNumber(Dictionary<string, Sprite> sprites, Func<int, string> numberFormatter, string dot = null)
        {
            sprite = new SpriteNumber(
                Enumerable.Range(0, 10).Select(i => sprites[numberFormatter(i)]),
                dot != null ? sprites[dot] : null);

            counter = new Animator();
        }

        public void CountTo(int number)
        {
            number = Math.Max(0, number);
            counter.Start(0, number, Animator.Interpolations.Linear, CountSpeed);
        }

        public bool Finished => counter.Finished;

        public int Value
        {
            get { return (int)counter.Value; }
            set { sprite.Value = value; }
        }

        public float Width => sprite.Width;

        public float Height => sprite.Height;

        public void Update(TimeSpan dt)
        {
            if (!Finished)
            {
                counter.Update(dt);
                sprite.Value = Value;
            }
        }

        public void Draw(SKCanvas canvas, float x, float y)
        {
            sprite.Draw(canvas, x, y);
        }
    }
}
