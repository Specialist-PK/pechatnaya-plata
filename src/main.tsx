import { mountMagazine } from '@components/Magazine'
import './global.css'

const root = document.querySelector<HTMLElement>('#app')
if (!root) throw new Error('Missing #app mount point')

mountMagazine(root)
