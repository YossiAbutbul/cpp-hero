/**
 * Lesson player (#/lesson/:id, immersive; legacy session.playLesson):
 * concept → demo → the lesson's own challenges (a first miss is re-queued
 * once at the end) → results (recap + new vault cards behind "What you learned").
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useGame } from '@/app/gameContext';
import { goBack } from '@/app/navigation';
import type { Challenge, Lesson, World } from '@/content/schema';
import { ChallengeRunner, TYPE_LABELS, type ChallengeResult } from '@/features/challenges';
import { CodeBlock, CodeDemo } from '@/features/code';
import { Curlo } from '@/features/curlo/Curlo';
import { SpeechBubble } from '@/features/curlo/SpeechBubble';
import { curloLine } from '@/features/curlo/voice';
import { useCurloReact } from '@/features/curlo/useCurloReact';
import { Button } from '@/ui/Button';
import { Expander } from '@/ui/Expander';
import { slideUp } from '@/ui/fx/motion';
import { Icon } from '@/ui/Icon';
import { Card, Screen } from '@/ui/Layout';
import { Md } from '@/ui/Md';
import { plural } from '@/ui/format';
import { Results, sessionTiles } from '@/features/session/Results';
import { SessionFrame, SlidePage } from '@/features/session/SessionFrame';
import { useQuit } from '@/features/session/useQuit';
import styles from './lesson.module.css';

interface QItem {
  ch: Challenge;
  retry?: boolean;
}

type Page = 'intro' | 'demo' | 'ch' | 'results';

const cap = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

export function LessonScreen() {
  const { id = '' } = useParams();
  const { game } = useGame();
  const lesson = game.index.lesson[id];
  const meta = game.index.lessonMeta[id];
  if (!lesson || !meta) return <Missing text="Lesson not found." />;
  if (!game.lessonUnlocked(meta.world, meta.index)) return <Missing text="This lesson is still locked." />;
  return <LessonPlayer key={lesson.id} lesson={lesson} world={meta.world} index={meta.index} />;
}

function Missing({ text }: { text: string }) {
  return (
    <Screen label="Lesson" immersive>
      <Card>
        <p>{text}</p>
        <Button variant="ghost" icon="back" onClick={() => goBack('/', { dir: 'close' })}>
          Back to the map
        </Button>
      </Card>
    </Screen>
  );
}

// Only the lesson's own questions: review lives in Practice, so nothing off-topic shows up here.
function buildQueue(lesson: Lesson): QItem[] {
  return lesson.challenges.map((ch) => ({ ch }));
}

function LessonPlayer({ lesson, world, index }: { lesson: Lesson; world: World; index: number }) {
  const { game, store } = useGame();
  const [queue, setQueue] = useState<QItem[]>(() => buildQueue(lesson));
  const [page, setPage] = useState<Page>('intro');
  const [qi, setQi] = useState(0);
  const [firstTry, setFirstTry] = useState<Record<string, boolean>>({});
  const [bestCombo, setBestCombo] = useState(0);
  const [t0] = useState(() => Date.now());
  const [xp0] = useState(() => store.state.xp);
  const [finish, setFinish] = useState<null | {
    seconds: number;
    xp: number;
    accuracy: number;
    right: number;
    total: number;
    first: boolean;
    newCards: number;
    line: string;
  }>(null);
  const [retriedIds, setRetriedIds] = useState<string[]>([]);
  const askQuit = useQuit('lesson');

  useEffect(() => {
    game.resetCombo();
  }, [game]);

  const hasDemo = !!lesson.demo?.code;
  const total = queue.length + 2;
  const done = page === 'intro' ? 0 : page === 'demo' ? 1 : page === 'ch' ? 2 + qi : total;

  const onResult = (item: QItem) => (r: ChallengeResult) => {
    setBestCombo((b) => Math.max(b, game.combo));
    if (!item.retry) setFirstTry((f) => ({ ...f, [item.ch.id]: r.firstTry }));
    if (!r.correct && !item.retry && !retriedIds.includes(item.ch.id)) {
      setRetriedIds((x) => [...x, item.ch.id]);
      setQueue((q) => [...q, { ch: item.ch, retry: true }]);
    }
  };

  const next = () => {
    if (qi + 1 < queue.length) setQi(qi + 1);
    else finishLesson();
  };

  const finishLesson = () => {
    const r = game.finishLesson(lesson, firstTry);
    const ids = Object.keys(firstTry);
    setFinish({
      seconds: Math.round((Date.now() - t0) / 1000),
      xp: store.state.xp - xp0,
      accuracy: r.accuracy,
      right: ids.filter((k) => firstTry[k]).length,
      total: ids.length,
      first: r.first,
      newCards: r.newCards.length,
      line: curloLine('lessonDone'),
    });
    setPage('results');
  };

  const item = queue[qi];
  const pageKey = page === 'ch' ? `ch:${qi}` : page;

  let body: ReactNode;
  if (page === 'intro')
    body = (
      <SlidePage pageKey="intro">
        <Intro
          lesson={lesson}
          world={world}
          index={index}
          next={hasDemo ? 'Show me the code' : 'Let’s practice'}
          onNext={() => setPage(hasDemo ? 'demo' : 'ch')}
        />
      </SlidePage>
    );
  else if (page === 'demo' && lesson.demo)
    body = (
      <SlidePage pageKey="demo" enterOnMount>
        <div className={styles.eyebrow}>Watch it run</div>
        <h2 className={styles.h2}>{lesson.title}</h2>
        <CodeDemo demo={lesson.demo} unsafe={lesson.shield && lesson.demo.steps.some((s) => s.crash)} />
        <Button
          variant="teal"
          size="big"
          block
          iconEnd="next"
          className={styles.pageNext}
          onClick={() => setPage('ch')}
        >
          Let’s practice!
        </Button>
      </SlidePage>
    );
  else if (page === 'ch' && item)
    body = (
      <SlidePage pageKey={pageKey} enterOnMount>
        <ChallengeRunner
          key={pageKey}
          challenge={item.ch}
          mode="lesson"
          eyebrow={`${TYPE_LABELS[item.ch.type]}${item.retry ? ' · Try again' : ''}`}
          onResult={onResult(item)}
          onContinue={next}
        />
      </SlidePage>
    );
  else if (page === 'results' && finish)
    body = (
      <SlidePage pageKey="results" enterOnMount>
        <Results
          title="Lesson complete!"
          sub={finish.line}
          tiles={sessionTiles({
            xp: finish.xp,
            right: finish.right,
            total: finish.total,
            bestCombo,
            seconds: finish.seconds,
          })}
          extra={
            <div className={styles.gains}>
              {finish.accuracy >= 1 && (
                <div className={styles.perfect}>
                  <Icon name="star" /> Perfect lesson! +10 bonus XP
                </div>
              )}
              {finish.first && (
                <div className={styles.statGain}>
                  <Icon name="chart" /> {cap(lesson.shield ? 'defense' : lesson.skill)} stat up!
                </div>
              )}
              {finish.newCards > 0 && (
                <div className={styles.statGain}>
                  <Icon name="vault" /> {plural(finish.newCards, 'new Code Vault card')}
                </div>
              )}
              <Expander label="What you learned" lessLabel="Hide">
                <Recap lesson={lesson} />
              </Expander>
            </div>
          }
          variant="lesson"
          onContinue={() => goBack('/', { dir: 'close' })}
        />
      </SlidePage>
    );

  return (
    <SessionFrame
      label={lesson.title}
      progress={done / total}
      onQuit={() => (page === 'results' ? goBack('/', { dir: 'close' }) : void askQuit())}
      scrollKey={pageKey}
      variant="lesson"
    >
      {body}
    </SessionFrame>
  );
}

function Intro({
  lesson,
  world,
  index,
  next,
  onNext,
}: {
  lesson: Lesson;
  world: World;
  index: number;
  next: string;
  onNext: () => void;
}) {
  const c = lesson.concept;
  const curlo = useCurloReact('happy');
  useEffect(() => {
    const t = window.setTimeout(() => curlo.react('celebrate', 900), 500);
    return () => clearTimeout(t);
  }, [curlo]);
  const more = c.body.length > 0 || !!c.pitfall;
  return (
    <div className={styles.intro}>
      <div className={styles.eyebrow}>
        World {world.num} · Lesson {index + 1}
        {lesson.shield && (
          <span className={styles.shieldBadge}>
            <Icon name="shield" /> Shield lesson
          </span>
        )}
      </div>
      <h2 className={styles.h2}>{lesson.title}</h2>
      <p className={styles.conceptShort}>
        <Md text={c.short} />
      </p>
      {c.analogy && (
        <div className={styles.analogy}>
          <div className={styles.mini}>
            <Curlo {...curlo.props} />
          </div>
          <SpeechBubble tail="left">
            <Md text={c.analogy} />
          </SpeechBubble>
        </div>
      )}
      {more && (
        <Expander>
          {c.body.length > 0 && (
            <Card className={styles.concept}>
              {c.body.map((p, i) => (
                <p key={i}>
                  <Md text={p} />
                </p>
              ))}
            </Card>
          )}
          {c.pitfall && (
            <div className={styles.pitfall} role="note">
              <Icon name="warn" />
              <div>
                <b>Common mistake</b>
                <p>
                  <Md text={c.pitfall} />
                </p>
              </div>
            </div>
          )}
        </Expander>
      )}
      <Button size="big" block iconEnd="next" className={styles.pageNext} onClick={onNext} autoFocus>
        {next}
      </Button>
    </div>
  );
}

/** The lesson's recap bullets + new Vault cards (inside the results' "What you learned"). */
function Recap({ lesson }: { lesson: Lesson }) {
  useEffect(() => {
    document.querySelectorAll(`.${styles.recapList} li`).forEach((li, k) => slideUp(li, 120 + k * 90));
  }, []);
  return (
    <div className={styles.recap}>
      <ul className={styles.recapList}>
        {lesson.recap.map((r, i) => (
          <li key={i}>
            <Icon name="ok" />
            <span>
              <Md text={r} />
            </span>
          </li>
        ))}
      </ul>
      {lesson.vault.length > 0 && (
        <div className={styles.vaultNew}>
          <div className={styles.eyebrow}>
            <Icon name="vault" /> New in your Code Vault
          </div>
          {lesson.vault.map((v) => (
            <Card key={v.id} className={styles.vaultCard}>
              <b>
                {v.defense && <Icon name="shield" />} {v.title}
              </b>
              <CodeBlock code={v.code} safe={v.defense} />
              {v.note && (
                <p className="small">
                  <Md text={v.note} />
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
