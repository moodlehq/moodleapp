# Angular Signals Migration Guide

**Project:** Aspire Moodle App
**Context:** Upstream v5.1.0 migration
**Researched:** 2026-01-23
**Confidence:** HIGH (official Angular documentation)

## Executive Summary

Angular 17+ introduces signal-based APIs that replace decorator-based patterns. The upstream Moodle App v5.1.0 uses these new patterns extensively. This guide covers the migration from traditional `@ViewChild`, `@Input`, and related decorators to their signal-based equivalents.

**Key changes:**
- `@ViewChild(Component) prop?: Type` becomes `readonly prop = viewChild(Component)`
- `@Input() prop: Type` becomes `readonly prop = input<Type>()`
- Template access changes from `prop?.method()` to `prop()?.method()`

---

## Table of Contents

1. [Signal Queries: ViewChild Migration](#1-signal-queries-viewchild-migration)
2. [Signal Inputs Migration](#2-signal-inputs-migration)
3. [Template Syntax Changes](#3-template-syntax-changes)
4. [Reactivity Patterns](#4-reactivity-patterns)
5. [Migration Checklist](#5-migration-checklist)

---

## 1. Signal Queries: ViewChild Migration

### API Overview

| Decorator | Signal Function | Return Type |
|-----------|-----------------|-------------|
| `@ViewChild(X)` | `viewChild(X)` | `Signal<T \| undefined>` |
| `@ViewChild(X) prop!: Type` | `viewChild.required(X)` | `Signal<T>` |
| `@ViewChildren(X)` | `viewChildren(X)` | `Signal<T[]>` |
| `@ContentChild(X)` | `contentChild(X)` | `Signal<T \| undefined>` |
| `@ContentChildren(X)` | `contentChildren(X)` | `Signal<T[]>` |

### Import Changes

```typescript
// Before
import { Component, ViewChild, ViewChildren, ElementRef } from '@angular/core';

// After
import { Component, viewChild, viewChildren, ElementRef } from '@angular/core';
```

### Pattern 1: Optional ViewChild with Component Type

**Before (Aspire pattern):**
```typescript
@Component({...})
export class MyPage {
    @ViewChild(CoreSitePluginsPluginContentComponent) content?: CoreSitePluginsPluginContentComponent;

    refreshData(): void {
        this.content?.refreshContent();
    }
}
```

**After (v5.1.0 pattern):**
```typescript
@Component({...})
export class MyPage {
    readonly content = viewChild(CoreSitePluginsPluginContentComponent);

    refreshData(): void {
        this.content()?.refreshContent();
    }
}
```

### Pattern 2: Required ViewChild with Component Type

**Before:**
```typescript
@Component({...})
export class ParticipantsPage {
    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    ngAfterViewInit(): void {
        this.splitView.outletActivated.subscribe(...);
    }
}
```

**After:**
```typescript
@Component({...})
export class ParticipantsPage {
    readonly splitView = viewChild.required(CoreSplitViewComponent);

    constructor() {
        // Can use effect() instead of ngAfterViewInit
        effect(() => {
            const view = this.splitView();
            // React to splitView being available
        });
    }
}
```

### Pattern 3: ViewChild with ElementRef

**Before:**
```typescript
@Component({
    template: `<div #editor></div>`
})
export class RichTextEditor {
    @ViewChild('editor') editor?: ElementRef<HTMLDivElement>;

    ngAfterViewInit(): void {
        this.editor?.nativeElement.focus();
    }
}
```

**After:**
```typescript
@Component({
    template: `<div #editor></div>`
})
export class RichTextEditor {
    readonly editor = viewChild<ElementRef<HTMLDivElement>>('editor');

    focusEditor(): void {
        this.editor()?.nativeElement.focus();
    }
}
```

### Pattern 4: ViewChild with read Option

**Before:**
```typescript
@Component({
    template: `<ng-template #dynamicComponent></ng-template>`
})
export class CompileHtml {
    @ViewChild('dynamicComponent', { read: ViewContainerRef }) container?: ViewContainerRef;
}
```

**After:**
```typescript
@Component({
    template: `<ng-template #dynamicComponent></ng-template>`
})
export class CompileHtml {
    readonly container = viewChild('dynamicComponent', { read: ViewContainerRef });
}
```

### Pattern 5: ViewChildren

**Before:**
```typescript
@Component({...})
export class DashboardPage {
    @ViewChildren(CoreBlockComponent) blocksComponents?: QueryList<CoreBlockComponent>;

    refreshBlocks(): void {
        this.blocksComponents?.forEach(block => block.refresh());
    }
}
```

**After:**
```typescript
@Component({...})
export class DashboardPage {
    readonly blocksComponents = viewChildren(CoreBlockComponent);

    refreshBlocks(): void {
        this.blocksComponents().forEach(block => block.refresh());
    }
}
```

**Key difference:** No more `QueryList` - returns a plain array signal.

### Pattern 6: ViewChild Setter (Manual Migration Required)

**Before:**
```typescript
@Component({...})
export class ImageViewer {
    private swiper?: Swiper;

    @ViewChild('swiperRef') set swiperRef(swiperRef: ElementRef) {
        if (swiperRef) {
            this.swiper = swiperRef.nativeElement.swiper;
        }
    }
}
```

**After (using effect):**
```typescript
@Component({...})
export class ImageViewer {
    private swiper?: Swiper;
    readonly swiperRef = viewChild<ElementRef>('swiperRef');

    constructor() {
        effect(() => {
            const ref = this.swiperRef();
            if (ref) {
                this.swiper = ref.nativeElement.swiper;
            }
        });
    }
}
```

---

## 2. Signal Inputs Migration

### API Overview

| Decorator | Signal Function | Return Type |
|-----------|-----------------|-------------|
| `@Input() prop: Type` | `input<Type>()` | `InputSignal<Type \| undefined>` |
| `@Input() prop = defaultValue` | `input(defaultValue)` | `InputSignal<Type>` |
| `@Input({ required: true })` | `input.required<Type>()` | `InputSignal<Type>` |
| `@Input({ transform: fn })` | `input(default, { transform: fn })` | `InputSignal<TransformedType>` |

### Import Changes

```typescript
// Before
import { Component, Input } from '@angular/core';

// After
import { Component, input } from '@angular/core';
```

### Pattern 1: Optional Input with Default

**Before:**
```typescript
@Component({...})
export class CommentsComponent {
    @Input() area = '';
    @Input() title?: string;
    @Input() courseId?: number;
}
```

**After:**
```typescript
@Component({...})
export class CommentsComponent {
    readonly area = input('');
    readonly title = input<string>();
    readonly courseId = input<number>();
}
```

### Pattern 2: Required Input

**Before:**
```typescript
@Component({...})
export class QuestionComponent {
    @Input({ required: true }) question!: CoreQuestionQuestion;
    @Input({ required: true }) component!: string;
}
```

**After:**
```typescript
@Component({...})
export class QuestionComponent {
    readonly question = input.required<CoreQuestionQuestion>();
    readonly component = input.required<string>();
}
```

### Pattern 3: Input with Transform

**Before:**
```typescript
import { booleanAttribute, numberAttribute } from '@angular/core';

@Component({...})
export class MyComponent {
    @Input({ transform: booleanAttribute }) disabled = false;
    @Input({ transform: numberAttribute }) size = 0;
}
```

**After:**
```typescript
import { booleanAttribute, numberAttribute, input } from '@angular/core';

@Component({...})
export class MyComponent {
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly size = input(0, { transform: numberAttribute });
}
```

### Pattern 4: Input with Alias

**Before:**
```typescript
@Component({...})
export class MyComponent {
    @Input('externalName') internalName = '';
}
```

**After:**
```typescript
@Component({...})
export class MyComponent {
    readonly internalName = input('', { alias: 'externalName' });
}
```

### Pattern 5: Using Input Values in Code

**Before:**
```typescript
@Component({...})
export class ProfileField {
    @Input() field?: CoreUserProfileField;
    @Input() courseId?: number;

    getFieldValue(): string {
        return this.field?.value ?? '';
    }

    ngOnChanges(): void {
        if (this.courseId) {
            this.loadCourseData(this.courseId);
        }
    }
}
```

**After:**
```typescript
@Component({...})
export class ProfileField {
    readonly field = input<CoreUserProfileField>();
    readonly courseId = input<number>();

    getFieldValue(): string {
        return this.field()?.value ?? '';
    }

    constructor() {
        // Replace ngOnChanges with effect
        effect(() => {
            const id = this.courseId();
            if (id) {
                this.loadCourseData(id);
            }
        });
    }
}
```

---

## 3. Template Syntax Changes

### Accessing Signal Values in Templates

Signals must be called as functions in templates:

**Before:**
```html
<div *ngIf="content">
    <span>{{ content.title }}</span>
    <button (click)="content.refresh()">Refresh</button>
</div>
```

**After:**
```html
@if (content()) {
    <span>{{ content().title }}</span>
    <button (click)="content().refresh()">Refresh</button>
}
```

### Null Safety Patterns

**Before:**
```html
<core-component [data]="field?.value" *ngIf="field"></core-component>
```

**After:**
```html
@if (field(); as fieldValue) {
    <core-component [data]="fieldValue.value"></core-component>
}
```

### Passing Signals to Child Components

**Before:**
```html
<child-component [courseId]="courseId" [title]="title"></child-component>
```

**After:**
```html
<!-- Signal values must be unwrapped -->
<child-component [courseId]="courseId()" [title]="title()"></child-component>
```

### ViewChild in Templates

**Before:**
```html
<ng-container *ngIf="activityComponent">
    {{ activityComponent.status }}
</ng-container>
```

**After:**
```html
@if (activityComponent(); as component) {
    {{ component.status }}
}
```

---

## 4. Reactivity Patterns

### computed() for Derived Values

Use `computed()` when you need values derived from other signals:

```typescript
import { computed, input } from '@angular/core';

@Component({...})
export class UserProfile {
    readonly user = input<User>();
    readonly courseId = input<number>();

    // Derived signal - automatically updates when inputs change
    readonly displayName = computed(() => {
        const user = this.user();
        return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
    });

    readonly isEnrolled = computed(() => {
        const user = this.user();
        const courseId = this.courseId();
        return user?.enrolledCourses?.includes(courseId) ?? false;
    });
}
```

### effect() for Side Effects

Use `effect()` when you need to perform actions when signals change:

```typescript
import { effect, viewChild, ElementRef } from '@angular/core';

@Component({...})
export class SearchComponent {
    readonly searchField = viewChild<ElementRef<HTMLInputElement>>('searchField');
    readonly query = input<string>();

    constructor() {
        // React to searchField becoming available
        effect(() => {
            const field = this.searchField();
            if (field) {
                field.nativeElement.focus();
            }
        });

        // React to query changes (replaces ngOnChanges)
        effect(() => {
            const query = this.query();
            if (query) {
                this.performSearch(query);
            }
        });
    }
}
```

### When to Use Each

| Pattern | Use Case |
|---------|----------|
| `computed()` | Deriving values from signals (pure transformation) |
| `effect()` | Side effects: DOM manipulation, logging, localStorage, API calls |
| Direct call `signal()` | Reading signal values in methods or templates |

**Rules:**
- `computed()` must be pure - no side effects, no async
- `effect()` should not update other signals (causes circular updates)
- Prefer `computed()` over `effect()` when possible

---

## 5. Migration Checklist

### Pre-Migration

- [ ] Identify all `@ViewChild` usages in component
- [ ] Identify all `@Input` usages in component
- [ ] Check for `ngOnChanges` that needs conversion to `effect()`
- [ ] Check for ViewChild setters that need manual conversion
- [ ] Review templates for property access that needs `()` calls

### Component Class Migration

- [ ] Add imports: `viewChild`, `viewChildren`, `input`, `computed`, `effect`
- [ ] Convert `@ViewChild(X) prop?` to `readonly prop = viewChild(X)`
- [ ] Convert `@ViewChild(X) prop!` to `readonly prop = viewChild.required(X)`
- [ ] Convert `@ViewChildren(X)` to `readonly prop = viewChildren(X)`
- [ ] Convert `@Input() prop` to `readonly prop = input<Type>()`
- [ ] Convert `@Input({ required: true })` to `input.required<Type>()`
- [ ] Add `()` to all signal property accesses in methods
- [ ] Convert `ngOnChanges` logic to `effect()` where appropriate
- [ ] Convert ViewChild setters to `effect()` pattern

### Template Migration

- [ ] Add `()` to all signal property accesses
- [ ] Update `*ngIf="prop"` to `@if (prop())` or `@if (prop(); as value)`
- [ ] Update property bindings `[x]="prop"` to `[x]="prop()"`
- [ ] Update string interpolation `{{ prop }}` to `{{ prop() }}`
- [ ] Update method calls on signals: `prop.method()` to `prop().method()` or `prop()?.method()`

### Post-Migration Verification

- [ ] All templates compile without errors
- [ ] No TypeScript errors about missing `()` calls
- [ ] Signal reactivity works (changes propagate correctly)
- [ ] `effect()` cleanups are proper (no memory leaks)

---

## Quick Reference Card

### Decorator to Signal Mapping

```typescript
// ViewChild
@ViewChild(Comp) c?: Comp           →  readonly c = viewChild(Comp)
@ViewChild(Comp) c!: Comp           →  readonly c = viewChild.required(Comp)
@ViewChild('ref') el?: ElementRef   →  readonly el = viewChild<ElementRef>('ref')
@ViewChild('ref', {read: VCR})      →  readonly el = viewChild('ref', {read: VCR})

// ViewChildren
@ViewChildren(Comp) cs?: QueryList  →  readonly cs = viewChildren(Comp)

// Input
@Input() prop?: Type                →  readonly prop = input<Type>()
@Input() prop = defaultVal          →  readonly prop = input(defaultVal)
@Input({required: true}) prop!      →  readonly prop = input.required<Type>()
@Input({transform: fn}) prop        →  readonly prop = input(def, {transform: fn})
```

### Access Patterns

```typescript
// In code
this.prop              →  this.prop()
this.prop?.method()    →  this.prop()?.method()
this.items.forEach()   →  this.items().forEach()

// In templates
{{ prop }}             →  {{ prop() }}
[input]="prop"         →  [input]="prop()"
*ngIf="prop"           →  @if (prop())
prop?.value            →  prop()?.value
```

---

## Sources

- [Angular Signal Queries Migration](https://angular.dev/reference/migrations/signal-queries)
- [Angular Signal Inputs Migration](https://angular.dev/reference/migrations/signal-inputs)
- [Angular Component Queries Guide](https://angular.dev/guide/components/queries)
- [Angular Component Inputs Guide](https://angular.dev/guide/components/inputs)
- [Angular viewChild API Reference](https://angular.dev/api/core/viewChild)
- [Angular Signals Overview](https://angular.dev/guide/signals)
- [Angular University: viewChild/contentChild Guide](https://blog.angular-university.io/angular-viewchild-contentchild/)
- [Angular University: Signal Inputs Guide](https://blog.angular-university.io/angular-signal-inputs/)
