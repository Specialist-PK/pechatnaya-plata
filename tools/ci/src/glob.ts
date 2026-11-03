export function globToRegExp(glob: string): RegExp {
  let out = ''
  for (let index = 0; index < glob.length; index++) {
    const rest = glob.slice(index)
    if (rest.startsWith('**/')) {
      out += '(?:.*/)?'
      index += 2
    } else if (rest.startsWith('**')) {
      out += '.*'
      index += 1
    } else if (rest.startsWith('*')) {
      out += '[^/]*'
    } else {
      out += (glob[index] as string).replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`^${out}$`)
}

export const matchesGlob = (glob: string, path: string): boolean => globToRegExp(glob).test(path)
