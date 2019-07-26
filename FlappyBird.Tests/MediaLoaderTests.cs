using System;
using System.Threading.Tasks;
using FlappyBird.GameEngine;
using Xunit;

namespace FlappyBird.Tests
{
	public class MediaLoaderTests
	{
		private const string AtlasPng = "atlas.png";
		private const string FullPathAtlasPng = "Media/Graphics/atlas.png";

		[Fact]
		public void EmptyMediaLoaderThrows()
		{
			var ml = new MediaLoader();

			Assert.Throws<ArgumentException>(() => ml.LoadStream(AtlasPng));
		}

		[Fact]
		public void MediaLoaderLoadsStream()
		{
			var ml = new MediaLoader();

			ml.RegisterMediaAssembly<FlappyBirdGame>();

			using (var stream = ml.LoadStream(AtlasPng))
			{
				Assert.NotNull(stream);
			}
		}

		[Fact]
		public async Task MediaLoaderLoadsTexture()
		{
			var ml = new MediaLoader();

			ml.RegisterMediaAssembly<FlappyBirdGame>();

			using (var image = await ml.LoadTextureAsync(AtlasPng))
			{
				Assert.NotNull(image);
			}
		}

		[Fact]
		public async Task MediaLoaderLoadsFullPathTexture()
		{
			var ml = new MediaLoader();

			ml.RegisterMediaAssembly<FlappyBirdGame>();

			using (var image = await ml.LoadTextureAsync(FullPathAtlasPng))
			{
				Assert.NotNull(image);
			}
		}
	}
}
