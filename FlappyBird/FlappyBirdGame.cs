using System;
using System.Threading.Tasks;
using SkiaSharp;

using FlappyBird.GameEngine;
using FlappyBird.Sprites;

namespace FlappyBird
{
    public class FlappyBirdGame : Game
    {
        public const float ForwardSpeed = 2f / 0.015f;
        public static readonly SKRectI ButtonShadowBorder = new SKRectI(6, 2, 6, 10); // real button size: 104x57; sprite size: 116x70

        // game data
        private SpriteSheet spriteSheet;

        public FlappyBirdGame()
        {
            spriteSheet = new SpriteSheet("Media/Graphics/atlas.png", "Media/Data/atlas.txt");
        }

        public async override Task LoadContentAsync()
        {
            await base.LoadContentAsync();

            await spriteSheet.LoadAsync();

            var welcomeScreen = new WelcomeScreen(this, spriteSheet);
            welcomeScreen.PlayTapped += StartNewGame;

            CurrentScreen = welcomeScreen;
        }

        private void StartNewGame(object sender, EventArgs e)
        {
            var screen = new GameScreen(this, spriteSheet);
            //screen.PlayTapped += StartNewGame;

            TransisionTo(screen);
        }
    }
}
