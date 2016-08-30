using System;
using SkiaSharp;

namespace FlappyBird
{
    public class Screen
    {
        public Screen(Game game, SpriteSheet spriteSheet)
        {
            Game = game;
            SpriteSheet = spriteSheet;
        }

        public Game Game { get; private set; }

        public SpriteSheet SpriteSheet { get; private set; }

        public virtual void Update(TimeSpan dt)
        {
        }

        public virtual void Draw(SKCanvas canvas)
        {
        }

        public virtual void Tap(SKPointI point)
        {
        }

        public virtual void Resize(int width, int height)
        {
        }

        public virtual void Start()
        {
        }

        public bool HitTest(SKPoint hit, SKPoint location, SKSize size)
        {
            return
                hit.X >= location.X &&
                hit.Y >= location.Y &&
                hit.X <= location.X + size.Width &&
                hit.Y <= location.Y + size.Height;
        }
    }
}
