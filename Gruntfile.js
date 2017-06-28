module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    ts: {
      options: require('./tsconfig.json').compilerOptions,
      default: {
        src: ['src/**/*.ts', '!node_modules/**', '!src/**/*.d.ts'],
        outDir: './dist'
      }
    },

    watch: {
      ts: {
        files: ['src/**/*.ts'],
        tasks: ['ts']
      }
    },

    clean: ['dist']
  });

  grunt.registerTask('w', ['default', 'watch']);
  grunt.registerTask('default', ['ts:default']);
};
