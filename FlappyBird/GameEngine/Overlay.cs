using System;
using SkiaSharp;

using FlappyBird.Sprites;

namespace FlappyBird.GameEngine
{
    public class Overlay
    {
        public Overlay(Game game, SpriteSheet spriteSheet, bool hidden = false)
        {
            Game = game;
            SpriteSheet = spriteSheet;
            Visible = !hidden;
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
