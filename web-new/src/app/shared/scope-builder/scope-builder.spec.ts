import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScopeBuilderComponent } from './scope-builder.component';

describe('ScopeBuilderComponent', () => {
  let fixture: ComponentFixture<ScopeBuilderComponent>;
  let component: ScopeBuilderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScopeBuilderComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ScopeBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('summarizes empty as none', () => {
    expect(component.summary()).toContain('(none)');
  });

  it('toggles resource types into summary', () => {
    component.toggleResource('vm');
    component.toggleAction('list');
    expect(component.summary()).toContain('vm');
    expect(component.summary()).toContain('list');
    expect(component.summary()).toContain('all');
  });

  it('pattern preview matches inventory', () => {
    fixture.componentRef.setInput('inventory', [
      { id: '1', name: 'prod-web' },
      { id: '2', name: 'dev-db' },
    ]);
    component.setDomainKind('pattern');
    const input = document.createElement('input');
    input.value = 'prod-*';
    component.setPattern({ target: input } as unknown as Event);
    fixture.detectChanges();
    expect(component.patternPreview()).toContain('prod-web');
    expect(component.patternPreview()).not.toContain('dev-db');
  });
});
