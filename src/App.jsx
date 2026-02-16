import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ROUTES } from './routes/routes'
import Home from './pages/Home'
import ReadAndSelect from './pages/ReadAndSelect'
import FillInTheBlanks from './pages/FillInTheBlanks'
import ReadAndComplete from './pages/ReadAndComplete'
import ListenAndType from './pages/ListenAndType'
import WriteAboutThePhoto from './pages/WriteAboutThePhoto'
import SpeakAboutThePhoto from './pages/SpeakAboutThePhoto'
import ReadThenSpeak from './pages/ReadThenSpeak'
import InteractiveReading from './pages/InteractiveReading'
import InteractiveListening from './pages/InteractiveListening'
import WritingSample from './pages/WritingSample'
import SpeakingSample from './pages/SpeakingSample'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.HOME} element={<Home />} />
        <Route path={ROUTES.READ_AND_SELECT} element={<ReadAndSelect />} />
        <Route path={ROUTES.FILL_IN_THE_BLANKS} element={<FillInTheBlanks />} />
        <Route path={ROUTES.READ_AND_COMPLETE} element={<ReadAndComplete />} />
        <Route path={ROUTES.LISTEN_AND_TYPE} element={<ListenAndType />} />
        <Route path={ROUTES.WRITE_ABOUT_THE_PHOTO} element={<WriteAboutThePhoto />} />
        <Route path={ROUTES.SPEAK_ABOUT_THE_PHOTO} element={<SpeakAboutThePhoto />} />
        <Route path={ROUTES.READ_THEN_SPEAK} element={<ReadThenSpeak />} />
        <Route path={ROUTES.INTERACTIVE_READING} element={<InteractiveReading />} />
        <Route path={ROUTES.INTERACTIVE_LISTENING} element={<InteractiveListening />} />
        <Route path={ROUTES.WRITING_SAMPLE} element={<WritingSample />} />
        <Route path={ROUTES.SPEAKING_SAMPLE} element={<SpeakingSample />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
