export const QUOTES: { text: string; by: string }[] = [
  { text: 'Everybody has a plan until they get punched in the mouth.', by: 'Mike Tyson' },
  { text: 'Float like a butterfly, sting like a bee.', by: 'Muhammad Ali' },
  { text: "I hated every minute of training, but I said, don't quit.", by: 'Muhammad Ali' },
  { text: 'Kill the body and the head will die.', by: 'Joe Frazier' },
  { text: 'The hero and the coward both feel the same thing.', by: "Cus D'Amato" },
  { text: 'Boxing is like jazz. The better it is, the less people appreciate it.', by: 'George Foreman' },
  { text: "It ain't about how hard you hit. It's about how hard you can get hit and keep moving forward.", by: 'Rocky Balboa' },
  { text: 'Discipline is doing what you hate to do, but doing it like you love it.', by: 'Mike Tyson' },
];

export function quoteOfTheDay(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0).getTime();
  const day = Math.floor((date.getTime() - start) / 86_400_000);
  return QUOTES[day % QUOTES.length];
}
