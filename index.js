import Vue from 'vue'
import Component from 'vue-class-component'
import play from './play.svg'
import pause from './pause.svg'
import loading from './loading.svg'
import fullscreen from './fullscreen.svg'
import './index.scss'
import moment from 'moment'
import enableInlineVideo from 'iphone-inline-video' /* ios 8, 9 */


export function fix(num) {
  return num < 10 ? '0' + num : num
}


export function time(duration) {
  // 不可能超过天吧，我的天
  const d = moment.duration(duration, 'seconds')
  let result = `${fix(d.minutes())}:${fix(d.seconds())}`

  if(d.hours()) {
    return fix(d.hours()) + ':' + result
  } else {
    return result
  }
}


@Component({
  props: ['poster', 'src']
})
export default class MVideo extends Vue {
  duration = ''
  current  = '00:00'
  right    = '100%'
  videoIsPlaying  = false
  showPlayControl = true
  waiting = true
  showControls = false
  // slider 本身具有15px宽度
  left = '-7.5px'
  isTouched = false

  ref(name) {
    return this.$refs[name]
  }

  get video() {
    return this.$refs.video
  }

  get rect() {
    return this.$refs.rect.getBoundingClientRect()
  }

  /* 根据video的currentTime设置滑块和进度条指示 */
  updateProgress() {
    this.left = this.video.currentTime / this.video.duration * this.rect.width - 7.5 + 'px'
    this.right = (1 - this.video.currentTime / this.video.duration) * 100 + '%'
  }

  onPlaying() {
    this.waiting = false
  }

  onTimeupdate(evt) {
    if(this.isTouched) return // 时间选取的时候，有的浏览器不会暂停视频的播放状态
    this.updateProgress()
    this.current = time(this.video.currentTime)
    this.$emit('timeupdate', evt)
  }

  onPause() {
    this.videoIsPlaying = false
  }

  /* api */
  // 隐藏播放按钮
  hidePlayControl() {
    this.showPlayControl = false
  }

  // 显示播放按钮
  showPlayControl() {
    this.showPlayControl = true
  }

  hideStatusBar() {
    this.showControls = false
  }

  showStatusBar() {
    this.showControls = true
  }

  currentTime() {
    return this.video.currentTime
  }

  pause() {
    this.video.pause()
  }

  play() {
    this.video.play()
  }

  exitFullScreen() {
    if('webkitExitFullScreen' in this.$refs.video) {
      this.$refs.video.webkitExitFullScreen()
    } else if('exitFullScreen' in this.$refs.video) {
      this.$refs.video.exitFullScreen()
    }
    this.showControls = false
  }

  onSeek(evt) {
    clearTimeout(this.timeout)
    evt.stopPropagation()
    const current = ((evt.pageX || evt.touches[0].pageX) - this.rect.left) / this.rect.width * this.video.duration
    this.video.currentTime = current
    this.setTimeout()
  }

  onWaiting() {
    this.waiting = true
  }

  onSliderTouchStart(evt) {
    evt.stopPropagation()
    clearTimeout(this.timeout)
    // this.video.pause()
    this.isTouched = true
    this.startX = evt.touches[0].pageX
    this.startTime = this.video.currentTime
  }

  // 移动圆形滑块
  onSliderTouchMove(evt) {
    evt.stopPropagation()
    this.delta = (evt.touches[0].pageX - this.startX)
    this.left = this.video.currentTime / this.video.duration * this.rect.width - 7.5 + this.delta + 'px'
    this.right = (1 - this.video.currentTime / this.video.duration - this.delta / this.rect.width) * 100 + '%'
  }

  // 松开滑块时设置视频的当前播放时间
  onSliderTouchEnd(evt) {
    evt.stopPropagation()
    this.setTimeout()
    this.isTouched = false
    this.video.currentTime = (parseFloat(this.left) + 7.5) / this.rect.width * this.video.duration
    this.$nextTick(this.updateProgress)
  }

  onLoadedMetaData() {
    this.duration = time(this.video.duration)
  }

  // 微信浏览器的loadedmetadata事件无法获取视频长度, 此方法可以
  onDurationchange() {
    this.duration = time(this.video.duration)
  }

  onWrapperClick(e) {
    e.preventDefault()  /* 安卓点击会更改video的播放暂停状态 */
    clearTimeout(this.timeout)
    if(this.videoIsPlaying) {
      this.showControls = !this.showControls
    }
    this.setTimeout()
  }

  setTimeout() {
    this.timeout = setTimeout(() => {
      this.showControls = false
    }, 4000)
  }

  /* android only */
  x5videoenterfullscreen(e) {
    this.video.style['object-position'] = "0px 0px"
    this.video.style['object-fit'] = "contain"
    this.video.style.height = 2000 + 'px'
    this.$emit('x5videoenterfullscreen')
  }

  x5videoexitfullscreen() {
    this.$emit('x5videoexitfullscreen')
  }

  /* 并不生效，to be 🤬 */
  onfullscreenchange(evt) {
    if(!document.fullscreen) {
      this.videoIsPlaying = false
      this.showControls = false
    }
  }

  // 使用mounted会导致chrome浏览器报错
  mounted() {
    enableInlineVideo(this.video)
    this.video.addEventListener('x5videoenterfullscreen', this.x5videoenterfullscreen)
    this.video.addEventListener('x5videoexitfullscreen', this.x5videoexitfullscreen)

    //  window.onresize = (e) => console.log(window.innerHeight)  Safari搜索框会变小，导致window的高度发生变化,然后页面被裁切
    //  overflow: scroll;
    //  -webkit - overflow - scrolling: touch;
  }

  destroy() {
    this.video.removeEventListener('x5videoenterfullscreen', this.x5videoenterfullscreen)
    this.video.removeEventListener('x5videoexitfullscreen', this.x5videoexitfullscreen)
  }

  /* 在android微信中会产生横屏全屏的效果, ios自带的全屏效果 */
  requestFullScreen() {
    if(this.video.requestFullscreen) this.video.requestFullscreen()
    else if(this.video.webkitEnterFullScreen) this.video.webkitEnterFullScreen()  // ios 11
    else if(this.video.webkitRequestFullscreen) this.video.webkitRequestFullscreen()
  }

  play() {
    this.videoIsPlaying = true
    this.$refs.video.play()
    // this.showControls = true
    this.setTimeout()
  }

  pause() {
    this.videoIsPlaying = false
    this.showControls = false
    this.video.pause()
  }

  render() {
    return (
      <div class="video-wrapper" onTouchstart={this.onWrapperClick /* 使用onclic 会导致全屏结束之后长按才能触发，原因未知 */}>
        <div class={`video-controls ${!this.showControls ? 'hidden' : ''}`} >
          <img class="video-pause-control" src={pause} onTouchstart={this.pause}/>
          <div class="video-status">
            <span class="time">{this.current}</span>
            <div class="total-time" ref="rect" onTouchstart={this.onSeek}>
              <span class="current-time" style={ {right: this.right} }></span>
              <i class="time-slider" style={ {left: this.left} }
                onTouchmove={this.onSliderTouchMove}
                onTouchend={this.onSliderTouchEnd}
                onTouchstart={this.onSliderTouchStart} >
              </i>
            </div>
            <span class="time">{this.duration || '直播'}</span>
          </div>
          <img src={fullscreen} onTouchstart={this.requestFullScreen}/>
        </div>
        { this.videoIsPlaying && this.waiting ? <img src={loading} class="video-play-control" /> : null }
        { !this.videoIsPlaying && this.showPlayControl ? <img src={play} class="video-play-control" onTouchstart={this.play}/> : null }
        <video ref="video" src={this.src}
          webkit-playsinline playsinline
          x5-video-player-type="h5" x5-video-player-fullscreen="true"
          onLoadedmetadata={this.onLoadedMetaData}
          onDurationchange={this.onDurationchange}
          onPause={this.onPause}
          onPlaying={this.onPlaying}
          onWaiting={this.onWaiting}
          onTimeupdate={this.onTimeupdate} poster={this.poster}>
        </video>
      </div>
    )
  }
}
