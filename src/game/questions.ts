export type TriviaQuestion = { category: string; prompt: string; options: string[]; answer: number }

export const questions: TriviaQuestion[] = [
  { category: 'Science', prompt: 'Which planet has the most moons currently known?', options: ['Jupiter', 'Saturn', 'Neptune', 'Uranus'], answer: 1 },
  { category: 'Nature', prompt: 'What is the only mammal capable of true flight?', options: ['Flying squirrel', 'Sugar glider', 'Bat', 'Colugo'], answer: 2 },
  { category: 'Geography', prompt: 'Which is the smallest country in the world?', options: ['Monaco', 'San Marino', 'Liechtenstein', 'Vatican City'], answer: 3 },
  { category: 'History', prompt: 'The ancient city of Petra is in which modern country?', options: ['Egypt', 'Jordan', 'Greece', 'Turkey'], answer: 1 },
  { category: 'Space', prompt: 'What is the name of our galaxy?', options: ['Andromeda', 'Whirlpool', 'Milky Way', 'Sombrero'], answer: 2 },
  { category: 'Food', prompt: 'Which spice is known as the most expensive by weight?', options: ['Vanilla', 'Cardamom', 'Saffron', 'Cinnamon'], answer: 2 },
  { category: 'Animals', prompt: 'How many hearts does an octopus have?', options: ['One', 'Two', 'Three', 'Four'], answer: 2 },
  { category: 'Art', prompt: 'Who painted The Starry Night?', options: ['Claude Monet', 'Vincent van Gogh', 'Paul Cézanne', 'Henri Matisse'], answer: 1 },
  { category: 'Science', prompt: 'What is the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], answer: 2 },
  { category: 'Geography', prompt: 'Which ocean is the largest?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 3 },
  { category: 'Technology', prompt: 'What does “www” stand for?', options: ['World Wide Web', 'Wide World Wire', 'Web World Window', 'World Web Works'], answer: 0 },
  { category: 'Nature', prompt: 'What is the fastest land animal?', options: ['Lion', 'Pronghorn', 'Cheetah', 'Springbok'], answer: 2 },
  { category: 'Literature', prompt: 'Who wrote “The Hobbit”?', options: ['C.S. Lewis', 'J.R.R. Tolkien', 'George Orwell', 'Terry Pratchett'], answer: 1 },
  { category: 'Science', prompt: 'How many bones are in the adult human body?', options: ['186', '206', '226', '246'], answer: 1 },
  { category: 'Geography', prompt: 'What is the capital of New Zealand?', options: ['Auckland', 'Christchurch', 'Wellington', 'Hamilton'], answer: 2 },
]
