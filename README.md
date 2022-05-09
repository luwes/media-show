# Media Show

Showcase your media player in style!


```html
<script type="module" src="https://unpkg.com/luwes/media-show"></script>

<media-show>
  <video
    slot="media"
    src="https://stream.mux.com/O6LdRc0112FEJXH00bGsN9Q31yu5EIVHTgjTKRkKtEq1k/high.mp4"
    poster="https://image.mux.com/O6LdRc0112FEJXH00bGsN9Q31yu5EIVHTgjTKRkKtEq1k/thumbnail.jpg?time=56"
    crossorigin
  >
    <track
      label="thumbnails"
      default
      kind="metadata"
      src="https://image.mux.com/O6LdRc0112FEJXH00bGsN9Q31yu5EIVHTgjTKRkKtEq1k/storyboard.vtt"
    />
  </video>
</media-show>
```
