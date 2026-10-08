# php-todo-lab for .NET developers: video series

Twelve narrated videos that take a senior .NET engineer (C#, EF Core, Clean
Architecture, MediatR) through the entire PHP backend in `backend/`, from the
language to reviewing a pull request. Every file path, excerpt, and number on
screen comes from this repository.

Each video folder holds the transcript (`script.md`), the slide deck
(`slides.html`, open it in a browser; arrow keys navigate), an outline
(`README.md`), the narration (`.mp3`), and the captioned 1080p video (`.mp4`).

| # | Video | Runtime | For the .NET reader who knows |
| --- | --- | --- | --- |
| 01 | [PHP 8.4 for .NET developers](01-php-for-dotnet-developers/README.md) | ~12 min | C# records, enums, switch expressions, lambdas, nullable types |
| 02 | [Laravel through ASP.NET Core eyes](02-laravel-through-aspnet-core-eyes/README.md) | ~11 min | `Program.cs`, `IServiceCollection`, `appsettings.json`, the `dotnet` CLI |
| 03 | [Routes, Form Requests and the thin controller](03-routes-form-requests-and-the-thin-controller/README.md) | ~10 min | Attribute routing, model binding, FluentValidation |
| 04 | [Actions and the repository port](04-actions-and-the-repository-port/README.md) | ~10 min | MediatR handlers, Clean Architecture use cases, repository interfaces |
| 05 | [The Eloquent model, migrations and factories](05-eloquent-model-migrations-and-factories/README.md) | ~9 min | EF Core entities, configurations, query filters, migrations, Bogus |
| 06 | [The Eloquent repository: queries, transactions and locks](06-eloquent-repository-transactions-and-locks/README.md) | ~9 min | `IQueryable`, change tracking, `ExecuteUpdate`, transactions, isolation |
| 07 | [API Resources and the JSON contract](07-api-resources-and-the-json-contract/README.md) | ~8 min | DTOs, `System.Text.Json`, API versioning |
| 08 | [Problem details and exception handling](08-problem-details-and-exception-handling/README.md) | ~8 min | `ProblemDetails`, `IExceptionHandler` |
| 09 | [Artisan commands and the scheduler](09-artisan-commands-and-the-scheduler/README.md) | ~8 min | `BackgroundService`, Quartz or Hangfire, `TimeProvider` |
| 10 | [Testing with Pest](10-testing-with-pest/README.md) | ~9 min | xUnit, FluentAssertions, `WebApplicationFactory`, Respawn, Testcontainers |
| 11 | [Quality gates: Pint, Larastan and CI](11-quality-gates-pint-larastan-and-ci/README.md) | ~8 min | `dotnet format`, Roslyn analysers, nullable reference types, CI |
| 12 | [Reviewing a PHP pull request](12-reviewing-a-php-pull-request/README.md) | ~10 min | Code review, ATDD, the pull request template |

Watch them in order; each video builds on the previous ones and ends with a
preview of the next.

## Regenerating a video

The media is generated from the three text files with the tools under
`tools/`. Narration uses the free `edge-tts` package (Microsoft Edge read-aloud;
no key, no Azure subscription); the video needs a Chromium, Chrome or Edge
binary and ffmpeg with libx264. Run from the repository root:

```sh
export PYTHON=python3                       # the interpreter that has edge-tts
python3 -m pip install edge-tts
node tools/video-audio/generate-audio.mjs docs/videos/NN-topic --dry-run   # validate the script, estimate the length
node tools/video-audio/generate-audio.mjs docs/videos/NN-topic             # synthesize NN-topic.mp3 and the timing manifest
node tools/video-build/build-video.mjs docs/videos/NN-topic --check        # resolve every slide cue, print the schedule
node tools/video-build/build-video.mjs docs/videos/NN-topic --slides-only  # render the slides to .cache/NN-topic/slides/
node tools/video-build/build-video.mjs docs/videos/NN-topic                # encode NN-topic.mp4 with burned-in captions
```

`EDGE_VOICE` and `EDGE_VOICE_2` override the narrator and second-speaker
voices, `EDGE_PATH` points at the browser binary, and `FFMPEG_PATH` and
`FFPROBE_PATH` at ffmpeg. Pronunciations of acronyms and identifiers live in
`tools/video-audio/pronunciations.json`; test one with
`node tools/video-audio/generate-audio.mjs --say "Larastan" --out .cache/say.mp3`.
Intermediate files go under `.cache/`, which is never committed.

## Adding a video

Follow the `creating-narrated-videos` skill under `.claude/skills/`: one topic
per video, the next free number, a `script.md` that makes sense with eyes
closed, a `slides.html` that uses `assets/slides.css` and `assets/slides.js`
with one `data-cue` per slide copied verbatim from the script, and a
`README.md` outline. Verify every path and excerpt against the repository, run
the dry run and the cue check, review the rendered slides, then build, and add
the video to the table above.
