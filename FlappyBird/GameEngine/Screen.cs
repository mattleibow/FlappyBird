using System;
using SkiaSharp;

using FlappyBird.Sprites;

namespace FlappyBird.GameEngine
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

        public virtual void TouchDown(SKPointI point)
        {
        }

        public virtual void TouchUp(SKPointI point)
        {
        }

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
    }
}
