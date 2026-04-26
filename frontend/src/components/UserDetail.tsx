import { AnimatePresence, motion } from "framer-motion"
import { useAnalysis } from "../store/analysis"
import { VideoPlayer } from "./VideoPlayer"
import { StatsPanel } from "./StatsPanel"
import { SignalsPanel } from "./SignalsPanel"
import { WorkflowStrip } from "./WorkflowStrip"
import { NarrationPanel } from "./NarrationPanel"

export function UserDetail() {
  const data = useAnalysis((s) => s.data)
  const selectedUserId = useAnalysis((s) => s.selectedUserId)
  if (!data) return null
  const user = data.users.find((u) => u.id === selectedUserId) ?? data.users[0]
  if (!user) return null

  return (
    <section>
      <div className="label mb-3">User {user.id} · detail</div>
      <AnimatePresence mode="wait">
        <motion.div
          key={user.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4">
            <VideoPlayer src={user.video} />
            <div className="space-y-4">
              <StatsPanel user={user} />
              <SignalsPanel mlp={user.mlp} />
            </div>
          </div>
          <WorkflowStrip
            workflow={user.workflow}
            labels={user.labels}
            pointImages={data.pointImages}
          />
          <NarrationPanel narration={user.narration} workflow={user.workflow} />
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
