const index = Bun.file('dist/index.html')

if (!(await index.exists())) {
  throw new Error('dist/index.html was not generated')
}

await Bun.write('dist/404.html', index)
