using System;
using SkiaSharp;

namespace FlappyBird
{
    public class Overlay
    {
        public Overlay(Game game, SpriteSheet spriteSheet)
        {
            Game = game;
            SpriteSheet = spriteSheet;
        }

        public Game Game { get; private set; }

        public SpriteSheet SpriteSheet { get; private set; }

        public bool Visible { get; protected set; }

        public bool Finished { get; protected set; }

        public virtual void Resize(int width, int height)
        {

        }

        public virtual void Show()
        {

        }

        public virtual void Update(TimeSpan dt)
        {

        }

        public virtual void Draw(SKCanvas canvas)
        {

        }

        public virtual void Hide()
        {

        }
    }
}
